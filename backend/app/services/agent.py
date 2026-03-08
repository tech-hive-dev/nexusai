"""
NexusAI Core Agent
─────────────────
The main AI agent that handles all conversations.
Uses Claude + RAG (vector search) + tool calling.
"""
import json
from typing import Optional
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from loguru import logger

from app.core.config import settings
from app.models.tenant import Tenant
from app.models.conversation import Conversation, Message
from app.models.customer import Customer
from app.services.knowledge import search_knowledge
from app.services.language import detect_language
from app.services.sentiment import analyze_sentiment, sentiment_to_tone_instruction

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

# ─── TOOLS the agent can use ───────────────────────────────────
AGENT_TOOLS = [
    {
        "name": "capture_lead",
        "description": "Save customer contact information (name, email, phone) to the CRM. Call this whenever a customer shares their contact details.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Customer's full name"},
                "email": {"type": "string", "description": "Customer's email address"},
                "phone": {"type": "string", "description": "Customer's phone number"},
            },
        },
    },
    {
        "name": "book_appointment",
        "description": "Book an appointment for the customer. Use when customer wants to schedule a meeting, consultation, or visit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_name": {"type": "string"},
                "customer_email": {"type": "string"},
                "date": {"type": "string", "description": "Preferred date (YYYY-MM-DD)"},
                "time": {"type": "string", "description": "Preferred time (HH:MM)"},
                "notes": {"type": "string", "description": "Any special notes or requirements"},
            },
            "required": ["customer_name", "date"],
        },
    },
    {
        "name": "check_order_status",
        "description": "Check the status of a customer's order by order ID or email.",
        "input_schema": {
            "type": "object",
            "properties": {
                "order_id": {"type": "string"},
                "customer_email": {"type": "string"},
            },
        },
    },
    {
        "name": "create_support_ticket",
        "description": "Create a support ticket for issues that need human attention.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "category": {
                    "type": "string",
                    "enum": ["billing", "delivery", "technical", "complaint", "refund", "other"]
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"]
                },
            },
            "required": ["title", "description", "category"],
        },
    },
    {
        "name": "send_payment_link",
        "description": "Send a payment link to the customer for a product or service.",
        "input_schema": {
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Amount in the business's currency"},
                "description": {"type": "string", "description": "What the payment is for"},
                "currency": {"type": "string", "default": "USD"},
            },
            "required": ["amount", "description"],
        },
    },
    {
        "name": "escalate_to_human",
        "description": "Escalate the conversation to a human agent. Use when: customer is very angry, issue is too complex, customer explicitly requests a human, or after 3 failed resolution attempts.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string", "description": "Why escalation is needed"},
            },
            "required": ["reason"],
        },
    },
    {
        "name": "suggest_upsell",
        "description": "Suggest a complementary or upgraded product when the customer shows buying intent. Only use when customer is actively interested in purchasing and there is a relevant upsell opportunity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "primary_product": {"type": "string", "description": "Product the customer is interested in"},
                "suggested_product": {"type": "string", "description": "Complementary or upgraded product to suggest"},
                "reason": {"type": "string", "description": "Why this upsell is relevant to the customer"},
            },
            "required": ["primary_product", "suggested_product", "reason"],
        },
    },
    {
        "name": "check_inventory",
        "description": "Check real-time stock availability for a product SKU. Use when a customer asks if a product is available, in stock, or wants to know delivery times.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sku": {"type": "string", "description": "Product SKU or identifier to check"},
            },
            "required": ["sku"],
        },
    },
]


async def run_agent(
    message: str,
    conversation_id: str,
    tenant: Tenant,
    customer: Customer,
    db: AsyncSession,
    media_url: Optional[str] = None,
) -> dict:
    """
    Main agent entry point.
    Returns: { response: str, tool_calls: list, language: str }
    """
    try:
        # 1. Detect language + sentiment in parallel
        import asyncio
        language, sentiment_result = await asyncio.gather(
            detect_language(message),
            analyze_sentiment(message),
        )

        # 2. Get conversation history
        history = await _get_history(conversation_id, db)

        # 3. Search knowledge base (RAG)
        knowledge_context = await search_knowledge(
            query=message,
            tenant_id=str(tenant.id),
            db=db,
            top_k=5,
        )

        # 4. Build system prompt (inject tone based on sentiment)
        tone_instruction = sentiment_to_tone_instruction(sentiment_result)
        system_prompt = _build_system_prompt(tenant, customer, knowledge_context, language, tone_instruction)

        # 5. Build messages — inject image if present
        user_content: list | str = message
        if media_url:
            try:
                from app.services.vision import download_and_encode, build_image_content_block
                b64, mime = await download_and_encode(media_url, settings.WHATSAPP_TOKEN)
                if b64:
                    user_content = [
                        build_image_content_block(b64, mime),
                        {"type": "text", "text": message or "Please identify this product and help the customer."},
                    ]
            except Exception as ve:
                logger.warning(f"Image processing skipped: {ve}")

        messages = history + [{"role": "user", "content": user_content}]

        # 6. Call Claude with tools
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1000,
            system=system_prompt,
            messages=messages,
            tools=AGENT_TOOLS,
        )

        # 7. Process response
        tool_results = []
        text_response = ""

        for block in response.content:
            if block.type == "text":
                text_response = block.text
            elif block.type == "tool_use":
                result = await _execute_tool(
                    tool_name=block.name,
                    tool_input=block.input,
                    conversation_id=conversation_id,
                    tenant=tenant,
                    customer=customer,
                    db=db,
                )
                tool_results.append({
                    "tool": block.name,
                    "input": block.input,
                    "result": result,
                })

        # 8. If tools were called, get final response
        if tool_results and not text_response:
            # Continue conversation with tool results
            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            tool_result_content = [
                {
                    "type": "tool_result",
                    "tool_use_id": tool_use_blocks[i].id,
                    "content": json.dumps(r["result"]),
                }
                for i, r in enumerate(tool_results)
            ]

            follow_up = await client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=800,
                system=system_prompt,
                messages=messages + [
                    {"role": "assistant", "content": response.content},
                    {"role": "user", "content": tool_result_content},
                ],
            )
            text_response = follow_up.content[0].text if follow_up.content else "I've processed your request."

        final_response = text_response or "I'm here to help! Could you please rephrase that?"

        # 9. Apply brand voice guardrails (blocked topics, vocab overrides, hide AI identity)
        try:
            from app.services.guardrails import check_guardrails
            final_response = await check_guardrails(final_response, tenant, system_prompt)
        except Exception as ge:
            logger.warning(f"Guardrails check skipped: {ge}")

        return {
            "response": final_response,
            "tool_calls": tool_results,
            "language": language,
            "sentiment": sentiment_result.emotion,
            "sentiment_score": sentiment_result.intensity,
            "should_escalate": sentiment_result.should_escalate,
        }

    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise e


def _build_system_prompt(tenant: Tenant, customer: Customer, knowledge: str, language: str, tone_instruction: str = "") -> str:
    customer_context = ""
    if customer:
        lines = [
            f"- Name: {customer.name or 'Unknown'}",
            f"- Language preference: {getattr(customer, 'language', language)}",
            f"- Previous interactions: {getattr(customer, 'total_conversations', 0)} conversations",
        ]
        summary = getattr(customer, "conversation_summary", None)
        if summary:
            lines.append(f"- Past interaction summary: {summary}")
        prefs = getattr(customer, "preferences", None)
        if prefs and isinstance(prefs, dict):
            for i, k in enumerate(prefs.keys()):
                if i >= 5:
                    break
                lines.append(f"- Preference — {k}: {prefs[k]}")
        last_order = getattr(customer, "last_order_summary", None)
        if last_order:
            lines.append(f"- Last order: {last_order}")
        if customer.notes:
            lines.append(f"- Notes: {customer.notes}")
        customer_context = "CUSTOMER MEMORY PROFILE:\n" + "\n".join(lines) + "\n"

    return f"""You are {tenant.agent_name}, an AI assistant for {tenant.name}.

BUSINESS CONTEXT:
- Industry: {tenant.industry or 'Business'}
- Persona: {tenant.agent_persona}
- Business hours: {tenant.business_hours}

{customer_context}

KNOWLEDGE BASE (use this to answer questions):
{knowledge if knowledge else "No specific knowledge loaded yet. Answer based on general knowledge."}

LANGUAGE INSTRUCTIONS:
- The customer is currently communicating in: {language}
- ALWAYS respond in the SAME language the customer uses
- If customer switches language mid-conversation, switch with them immediately
- You support all major languages

CAPABILITIES:
- Book appointments
- Check order status
- Create support tickets
- Capture customer contact info (leads)
- Send payment links
- Escalate to human agents

{tone_instruction}

BEHAVIOR RULES:
1. Be warm, professional, and concise
2. If you don't know something, say so honestly — never make up information
3. Capture lead info (name, email) naturally during conversation
4. After 3 failed attempts to resolve an issue, escalate to human
5. For angry customers, be extra empathetic and offer to escalate
6. Always confirm before booking appointments or sending payment links
7. Never discuss competitors negatively

ESCALATION TRIGGERS (escalate immediately):
- Customer uses words like "lawsuit", "lawyer", "sue", "fraud", "scam"
- Customer is abusive or extremely upset after 2 de-escalation attempts
- Customer explicitly asks for a human/manager
"""


async def _get_history(conversation_id: str, db: AsyncSession) -> list:
    """Get last 20 messages as Claude API format"""
    import uuid
    query_id = uuid.UUID(conversation_id) if isinstance(conversation_id, str) else conversation_id
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == query_id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    messages = result.scalars().all()
    messages.reverse()

    return [
        {"role": msg.role, "content": msg.content}
        for msg in messages
        if msg.role in ("user", "assistant")
    ]


async def _execute_tool(
    tool_name: str,
    tool_input: dict,
    conversation_id: str,
    tenant: Tenant,
    customer: Customer,
    db: AsyncSession,
) -> dict:
    """Execute agent tool calls"""
    logger.info(f"Executing tool: {tool_name} with input: {tool_input}")

    if tool_name == "capture_lead":
        return await _tool_capture_lead(tool_input, customer, db)

    elif tool_name == "book_appointment":
        return await _tool_book_appointment(tool_input, tenant, customer, conversation_id, db)

    elif tool_name == "check_order_status":
        return await _tool_check_order(tool_input, tenant, db)

    elif tool_name == "create_support_ticket":
        return await _tool_create_ticket(tool_input, tenant, customer, conversation_id, db)

    elif tool_name == "send_payment_link":
        return await _tool_send_payment(tool_input, tenant, customer)

    elif tool_name == "escalate_to_human":
        return await _tool_escalate(tool_input, conversation_id, tenant, db)

    elif tool_name == "suggest_upsell":
        return await _tool_suggest_upsell(tool_input, conversation_id, tenant, db)

    elif tool_name == "check_inventory":
        return await _tool_check_inventory(tool_input, tenant)

    return {"success": False, "error": f"Unknown tool: {tool_name}"}


async def _tool_capture_lead(tool_input: dict, customer: Customer, db: AsyncSession) -> dict:
    try:
        if customer:
            if tool_input.get("name") and not customer.name:
                customer.name = tool_input["name"]
            if tool_input.get("email") and not customer.email:
                customer.email = tool_input["email"]
            if tool_input.get("phone") and not customer.phone:
                customer.phone = tool_input["phone"]
            await db.commit()
        return {"success": True, "message": "Contact information saved"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _tool_book_appointment(tool_input: dict, tenant: Tenant, customer: Customer, conversation_id: str, db: AsyncSession) -> dict:
    try:
        from app.models.appointment import Appointment
        from datetime import datetime
        
        # 1. Attempt Cal.com booking if integrated
        cal_booking = None
        if getattr(tenant, "calcom_event_id", None):
            from app.services.calcom import create_booking
            start_time = f"{tool_input['date']}T{tool_input.get('time', '10:00')}:00Z"
            cal_booking = await create_booking(
                event_type_id=tenant.calcom_event_id,
                start_time=start_time,
                customer_name=tool_input.get("customer_name") or customer.name or "Customer",
                customer_email=tool_input.get("customer_email") or customer.email or "",
                notes=tool_input.get("notes", "")
            )

        # 2. Always record internally as well
        appt = Appointment(
            tenant_id=tenant.id,
            customer_id=customer.id if customer else None,
            conversation_id=conversation_id,
            title=f"Appointment for {tool_input.get('customer_name', 'Customer')}",
            scheduled_at=datetime.fromisoformat(
                f"{tool_input['date']}T{tool_input.get('time', '10:00')}:00"
            ),
            notes=tool_input.get("notes", ""),
            status="confirmed" if cal_booking else "pending",
            external_id=str(cal_booking.get("id")) if cal_booking else None
        )
        db.add(appt)
        await db.commit()
        
        msg = f"Appointment confirmed for {tool_input['date']} at {tool_input.get('time', '10:00')}."
        if cal_booking:
            msg += f" You'll receive a calendar invite at {tool_input.get('customer_email') or customer.email}."
        else:
            msg += " Our team will review and send a confirmation shortly."
            
        return {
            "success": True,
            "appointment_id": str(appt.id),
            "calcom_booking": cal_booking is not None,
            "message": msg,
        }
    except Exception as e:
        logger.error(f"Appointment booking error: {e}")
        return {"success": False, "error": "Could not book appointment. Please try again."}


async def _tool_check_order(tool_input: dict, tenant: Tenant, db: AsyncSession) -> dict:
    from app.models.order import Order
    from sqlalchemy import or_
    try:
        query = select(Order).where(Order.tenant_id == tenant.id)
        if tool_input.get("order_id"):
            query = query.where(Order.external_order_id == tool_input["order_id"])
        result = await db.execute(query.limit(1))
        order = result.scalar_one_or_none()
        if order:
            return {
                "success": True,
                "order_id": order.external_order_id,
                "status": order.status,
                "items": order.items,
                "total": str(order.total_amount),
            }
        return {"success": False, "message": "Order not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _tool_create_ticket(tool_input: dict, tenant: Tenant, customer: Customer, conversation_id: str, db: AsyncSession) -> dict:
    from app.models.ticket import Ticket
    try:
        ticket = Ticket(
            tenant_id=tenant.id,
            customer_id=customer.id if customer else None,
            conversation_id=conversation_id,
            title=tool_input["title"],
            description=tool_input["description"],
            category=tool_input["category"],
            priority=tool_input.get("priority", "medium"),
            status="open",
        )
        db.add(ticket)
        await db.commit()
        return {
            "success": True,
            "ticket_id": str(ticket.id),
            "message": f"Support ticket #{str(ticket.id).split('-')[0]} created. Our team will contact you within 24 hours.",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _tool_send_payment(tool_input: dict, tenant: Tenant, customer: Customer) -> dict:
    try:
        import stripe
        from app.core.config import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY

        if not settings.STRIPE_SECRET_KEY:
            return {"success": False, "message": "Payment processing not configured yet"}

        link = stripe.PaymentLink.create(
            line_items=[{
                "price_data": {
                    "currency": tool_input.get("currency", "usd").lower(),
                    "product_data": {"name": tool_input["description"]},
                    "unit_amount": int(tool_input["amount"] * 100),
                },
                "quantity": 1,
            }]
        )
        return {
            "success": True,
            "payment_url": link.url,
            "message": f"Payment link created for {tool_input['description']}: {link.url}",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _tool_escalate(tool_input: dict, conversation_id: str, tenant: Tenant, db: AsyncSession) -> dict:
    try:
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.status = "escalated"
            conv.is_human_takeover = False
            await db.commit()

        # Send notification email to business
        if tenant.escalation_email:
            from app.services.email import send_escalation_alert
            await send_escalation_alert(
                to_email=tenant.escalation_email,
                tenant_name=tenant.name,
                conversation_id=conversation_id,
                reason=tool_input["reason"],
            )

        return {
            "success": True,
            "message": "I've alerted our team and someone will be with you shortly. Thank you for your patience.",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _tool_suggest_upsell(tool_input: dict, conversation_id: str, tenant: Tenant, db: AsyncSession) -> dict:
    """Record upsell suggestion and return context for the agent to present it."""
    try:
        await db.execute(
            text("""
                INSERT INTO upsell_events (tenant_id, conversation_id, primary_product, suggested_product)
                VALUES (:tenant_id, :conversation_id, :primary_product, :suggested_product)
            """),
            {
                "tenant_id": str(tenant.id),
                "conversation_id": str(conversation_id),
                "primary_product": tool_input.get("primary_product", ""),
                "suggested_product": tool_input.get("suggested_product", ""),
            },
        )
        await db.commit()
        return {
            "success": True,
            "primary": tool_input.get("primary_product"),
            "suggested": tool_input.get("suggested_product"),
            "reason": tool_input.get("reason"),
            "message": f"Upsell suggestion recorded. Present {tool_input.get('suggested_product')} naturally in your response.",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _tool_check_inventory(tool_input: dict, tenant: Tenant) -> dict:
    """Check real-time stock level for a product SKU via Shopify."""
    try:
        from app.services.shopify import get_inventory
        sku = tool_input.get("sku", "")
        result = await get_inventory(sku, tenant)
        if result is None:
            return {
                "success": False,
                "message": "Inventory system not connected or product not found.",
            }
            
        status_label = "Status unknown"
        if hasattr(result, "status"):
             status_label = {
                "in_stock": f"✅ In stock — {getattr(result, 'available', 0)} units available",
                "low_stock": f"⚠️ Low stock — only {getattr(result, 'available', 0)} left",
                "out_of_stock": "❌ Currently out of stock",
            }.get(result.status, "Status unknown")

        return {
            "success": True,
            "sku": getattr(result, "sku", "N/A"),
            "product": getattr(result, "product_title", "Unknown"),
            "variant": getattr(result, "variant_title", ""),
            "available": getattr(result, "available", 0),
            "status": getattr(result, "status", "unknown"),
            "message": f"{getattr(result, 'product_title', 'Product')}: {status_label}.",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _detect_sentiment(message: str) -> str:
    """Quick sentiment classification"""
    negative_words = ["angry", "terrible", "awful", "hate", "worst", "horrible",
                      "frustrated", "useless", "broken", "refund", "cancel", "lawsuit"]
    positive_words = ["great", "amazing", "love", "excellent", "perfect", "thank",
                      "wonderful", "helpful", "awesome"]
    msg_lower = message.lower()
    if any(w in msg_lower for w in negative_words):
        return "negative"
    if any(w in msg_lower for w in positive_words):
        return "positive"
    return "neutral"
