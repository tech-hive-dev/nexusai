"""
Chat API
─────────
REST endpoint for widget chat + WebSocket for real-time dashboard monitoring.
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, Field
from typing import Optional
import json
from loguru import logger

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant
from app.models.tenant import Tenant
from app.models.conversation import Conversation, Message
from app.models.customer import Customer
from app.services.agent import run_agent

router = APIRouter()

# Active WebSocket connections per tenant (for dashboard live view)
active_connections: dict[str, list[WebSocket]] = {}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = Field(None, max_length=36)
    tenant_slug: str = Field(..., max_length=100)
    channel: str = Field("website", max_length=50)
    customer_external_id: Optional[str] = Field(None, max_length=255)
    customer_name: Optional[str] = Field(None, max_length=255)
    customer_email: Optional[str] = Field(None, max_length=255)
    media_url: Optional[str] = Field(None, max_length=2048)


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    language: str
    sentiment: str


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Main chat endpoint - called by website widget and channel integrations"""
    try:
        return await _send_message_inner(request, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint unhandled error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


async def _send_message_inner(request: ChatRequest, db: AsyncSession):
    # 1. Find tenant by slug
    result = await db.execute(
        select(Tenant).where(Tenant.slug == request.tenant_slug, Tenant.is_active == True)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 2. Check conversation limits
    if tenant.conversation_count >= tenant.conversation_limit:
        return ChatResponse(
            response="Thank you for reaching out! Our team will get back to you shortly.",
            conversation_id=request.conversation_id or "limited",
            language="en",
            sentiment="neutral",
        )

    # 3. Get or create customer
    customer = await _get_or_create_customer(
        tenant_id=str(tenant.id),
        external_id=request.customer_external_id or f"web_{request.channel}",
        channel=request.channel,
        name=request.customer_name,
        email=request.customer_email,
        db=db,
    )

    # 4. Get or create conversation
    conversation = await _get_or_create_conversation(
        conversation_id=request.conversation_id,
        tenant_id=str(tenant.id),
        customer_id=str(customer.id),
        channel=request.channel,
        db=db,
    )

    # 5. Save user message (with PII scan if enabled)
    display_message = request.message
    flagged_pii = False
    
    if getattr(tenant, "pii_detection_enabled", False):
        from app.services.pii import scan_message
        pii_result = await scan_message(request.message)
        if pii_result.has_pii:
            display_message = pii_result.redacted_text
            flagged_pii = True

    user_msg = Message(
        conversation_id=conversation.id,
        tenant_id=tenant.id,
        role="user",
        content=display_message,
        media_url=request.media_url,
        flagged_pii=flagged_pii,
    )
    db.add(user_msg)
    await db.flush()

    # 6. Skip if human is handling this conversation
    if conversation.is_human_takeover:
        await db.commit()
        return ChatResponse(
            response="",
            conversation_id=str(conversation.id),
            language=conversation.language,
            sentiment="neutral",
        )

    # 7. Run AI agent
    try:
        result_data = await run_agent(
            message=request.message,
            conversation_id=str(conversation.id),
            tenant=tenant,
            customer=customer,
            db=db,
            media_url=request.media_url,
        )
    except Exception as agent_err:
        logger.error(f"Agent failed for tenant {tenant.slug}: {agent_err}")
        await db.commit()  # save the user message at least
        raise HTTPException(status_code=500, detail=f"Agent error: {str(agent_err)}")

    # 8. Save assistant response
    assistant_msg = Message(
        conversation_id=conversation.id,
        tenant_id=tenant.id,
        role="assistant",
        content=result_data["response"],
    )
    db.add(assistant_msg)

    # 9. Update conversation
    conversation.language = result_data.get("language", "en")
    conversation.sentiment = result_data.get("sentiment", "neutral")

    # 10. Increment tenant conversation count
    tenant.conversation_count += 1

    await db.commit()

    # 11. Broadcast to dashboard websocket (live monitoring)
    await _broadcast_to_dashboard(
        tenant_id=str(tenant.id),
        event={
            "type": "new_message",
            "conversation_id": str(conversation.id),
            "customer_name": customer.name or "Anonymous",
            "channel": request.channel,
            "message": request.message,
            "response": result_data["response"],
            "language": result_data.get("language", "en"),
            "sentiment": result_data.get("sentiment", "neutral"),
        }
    )

    return ChatResponse(
        response=result_data["response"],
        conversation_id=str(conversation.id),
        language=result_data.get("language", "en"),
        sentiment=result_data.get("sentiment", "neutral"),
    )


@router.get("/conversations")
async def get_conversations(
    status: Optional[str] = None,
    limit: int = 50,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get all conversations for the tenant dashboard"""
    query = (
        select(Conversation)
        .where(Conversation.tenant_id == tenant.id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
    )
    if status:
        query = query.where(Conversation.status == status)

    result = await db.execute(query)
    conversations = result.scalars().all()

    convs_data = []
    for conv in conversations:
        # Get last message
        last_msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()

        # Get customer
        customer = None
        if conv.customer_id:
            cust_result = await db.execute(
                select(Customer).where(Customer.id == conv.customer_id)
            )
            customer = cust_result.scalar_one_or_none()

        convs_data.append({
            "id": str(conv.id),
            "status": conv.status,
            "channel": conv.channel,
            "language": conv.language,
            "sentiment": conv.sentiment,
            "customer_name": customer.name if customer else "Anonymous",
            "customer_email": customer.email if customer else None,
            "last_message": last_msg.content if last_msg else "",
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
        })

    return convs_data


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.tenant_id == tenant.id,
        )
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/takeover")
async def human_takeover(
    conversation_id: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Business owner takes over a conversation from AI"""
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id, Conversation.tenant_id == tenant.id)
        .values(is_human_takeover=True, status="human", human_agent_id=current_user.id)
    )
    await db.commit()
    return {"success": True, "message": "You've taken over this conversation"}


@router.post("/conversations/{conversation_id}/release")
async def release_to_ai(
    conversation_id: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Hand conversation back to AI"""
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id, Conversation.tenant_id == tenant.id)
        .values(is_human_takeover=False, status="open")
    )
    await db.commit()
    return {"success": True, "message": "AI agent resumed"}


@router.get("/conversations/search")
async def search_conversations(
    q: str = "",
    limit: int = 30,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Full-text search over conversation messages."""
    if not q.strip():
        return []
    result = await db.execute(
        select(
            Message.conversation_id,
            Message.content,
            Message.created_at,
        )
        .where(
            Message.tenant_id == tenant.id,
            Message.content.ilike(f"%{q}%"),
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    rows = result.fetchall()
    seen = set()
    hits = []
    for row in rows:
        conv_id = str(row.conversation_id)
        if conv_id not in seen:
            seen.add(conv_id)
            hits.append({
                "conversation_id": conv_id,
                "snippet": row.content[:120],
                "matched_at": row.created_at.isoformat(),
            })
    return hits


@router.patch("/conversations/{conversation_id}/annotate")
async def annotate_conversation(
    conversation_id: str,
    annotation: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Tag a conversation as training_example or policy_violation."""
    valid = {"training_example", "policy_violation", None, ""}
    if annotation not in valid:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid annotation value")
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id, Conversation.tenant_id == tenant.id)
        .values(annotation=annotation or None)
    )
    await db.commit()
    return {"success": True}


@router.get("/conversations/{conversation_id}/export/pdf")
async def export_conversation_pdf(
    conversation_id: str,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Export conversation as PDF audit trail."""
    from app.services.pdf_report import export_conversation_pdf as _gen_pdf
    pdf_bytes = await _gen_pdf(conversation_id, str(tenant.id), db)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Conversation not found or PDF generation failed")
    short_id = conversation_id.split("-")[0]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=conversation-{short_id}.pdf"},
    )


# ─── WEBSOCKET ───────────────────────────────────────────────
@router.websocket("/ws/{tenant_slug}")
async def websocket_endpoint(websocket: WebSocket, tenant_slug: str, token: Optional[str] = None):
    """Real-time dashboard connection for live conversation monitoring"""
    # Validate JWT before accepting the connection
    if not token:
        await websocket.close(code=4001)
        return
    try:
        from app.core.auth import decode_token
        from app.core.database import AsyncSessionLocal
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
        async with AsyncSessionLocal() as _db:
            from app.models.user import User
            _result = await _db.execute(select(User).where(User.id == user_id))
            _user = _result.scalar_one_or_none()
            if not _user or not _user.is_active:
                await websocket.close(code=4001)
                return
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    if tenant_slug not in active_connections:
        active_connections[tenant_slug] = []
    active_connections[tenant_slug].append(websocket)
    logger.info(f"Dashboard connected for tenant: {tenant_slug}")
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming dashboard messages (human replies)
            try:
                msg = json.loads(data)
                if msg.get("type") == "human_reply":
                    await _save_human_message(msg, tenant_slug)
            except Exception:
                pass
    except WebSocketDisconnect:
        active_connections[tenant_slug].remove(websocket)
        logger.info(f"Dashboard disconnected for tenant: {tenant_slug}")


async def _broadcast_to_dashboard(tenant_id: str, event: dict):
    """Send real-time update to all dashboard connections"""
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select

    # Find tenant slug
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            return
        slug = tenant.slug

    if slug in active_connections:
        disconnected = []
        for ws in active_connections[slug]:
            try:
                await ws.send_json(event)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            active_connections[slug].remove(ws)


async def _save_human_message(msg: dict, tenant_slug: str):
    """Persist a human agent reply and echo it to all dashboard WS connections."""
    from app.core.database import AsyncSessionLocal
    conversation_id = msg.get("conversation_id")
    content = msg.get("content", "").strip()
    if not conversation_id or not content:
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
        tenant = result.scalar_one_or_none()
        if not tenant:
            return
        
        # Save message
        new_msg = Message(
            conversation_id=conversation_id,
            tenant_id=tenant.id,
            role="assistant",
            content=content,
        )
        db.add(new_msg)
        
        # Update conversation timestamp
        from sqlalchemy import update
        from app.models.conversation import Conversation
        import datetime
        await db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(updated_at=datetime.datetime.now(datetime.timezone.utc))
        )
        
        await db.commit()

    # Broadcast back to all dashboard connections (including original sender for multi-tab sync)
    await _broadcast_to_dashboard(
        tenant_id=str(tenant.id),
        event={
            "type": "human_message",
            "conversation_id": conversation_id,
            "content": content,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        },
    )


async def _get_or_create_customer(
    tenant_id: str, external_id: str, channel: str,
    name: Optional[str], email: Optional[str], db: AsyncSession
) -> Customer:
    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.external_id == external_id,
            Customer.channel == channel,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            tenant_id=tenant_id,
            external_id=external_id,
            channel=channel,
            name=name,
            email=email,
        )
        db.add(customer)
        await db.flush()
    return customer


async def _get_or_create_conversation(
    conversation_id: Optional[str],
    tenant_id: str,
    customer_id: str,
    channel: str,
    db: AsyncSession,
) -> Conversation:
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id,
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv

    conv = Conversation(
        tenant_id=tenant_id,
        customer_id=customer_id,
        channel=channel,
        status="open",
    )
    db.add(conv)
    await db.flush()
    return conv
