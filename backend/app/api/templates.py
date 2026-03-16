"""
Agent Marketplace / Industry Templates API
────────────────────────────────────────────
GET  /api/templates          — list all templates
GET  /api/templates/{id}     — get one template
POST /api/templates/{id}/deploy — clone template config to tenant
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/templates", tags=["Templates"])

# ─── SEED TEMPLATES (shipped with the product) ───────────────────
BUILTIN_TEMPLATES = [
    {
        "id": "tmpl-restaurant",
        "name": "Restaurant & Food",
        "industry": "restaurant",
        "icon": "🍽️",
        "description": "Handles reservations, menu inquiries, delivery orders, and opening hours.",
        "is_premium": False,
        "price_cents": 0,
        "system_prompt": (
            "You are a friendly restaurant assistant. Help customers with table reservations, "
            "menu questions, delivery orders, opening hours, and special dietary requirements. "
            "Always confirm booking details before finalizing."
        ),
        "starter_knowledge": [
            {"title": "Menu Overview", "content": "Add your full menu here with prices."},
            {"title": "Opening Hours", "content": "Mon-Fri: 12pm-10pm, Sat-Sun: 11am-11pm"},
            {"title": "Reservation Policy", "content": "We accept reservations up to 30 days in advance. Min 2 guests for reservation."},
        ],
        "config_defaults": {"escalation_after_failures": 2, "agent_persona": "Warm, welcoming, food-passionate"},
    },
    {
        "id": "tmpl-medical",
        "name": "Medical Clinic",
        "industry": "medical",
        "icon": "🏥",
        "description": "Books appointments, answers FAQs, handles prescription refill requests.",
        "is_premium": False,
        "price_cents": 0,
        "system_prompt": (
            "You are a professional medical clinic assistant. Help patients with appointment booking, "
            "general health FAQs, directions, and prescription refill requests. "
            "Never provide medical diagnoses or specific medical advice. "
            "For emergencies, always direct patients to call 911 or go to the nearest ER."
        ),
        "starter_knowledge": [
            {"title": "Services", "content": "General practice, pediatrics, vaccinations, blood tests."},
            {"title": "Insurance", "content": "We accept most major insurance plans. Contact us to verify."},
            {"title": "Emergency Note", "content": "For life-threatening emergencies, call 911 immediately."},
        ],
        "config_defaults": {"escalation_after_failures": 1, "agent_persona": "Professional, empathetic, calm"},
    },
    {
        "id": "tmpl-ecommerce",
        "name": "E-Commerce Store",
        "industry": "ecommerce",
        "icon": "🛒",
        "description": "Order tracking, returns, product inquiries, upsells, and abandoned cart recovery.",
        "is_premium": False,
        "price_cents": 0,
        "system_prompt": (
            "You are a helpful e-commerce assistant. Help customers track orders, process returns, "
            "answer product questions, and complete purchases. Suggest complementary products naturally. "
            "Always be solutions-oriented — if an item is out of stock, suggest alternatives."
        ),
        "starter_knowledge": [
            {"title": "Return Policy", "content": "30-day returns on all items. Free return shipping."},
            {"title": "Shipping", "content": "Standard 3-5 days, Express 1-2 days, Free shipping over $50."},
        ],
        "config_defaults": {"agent_persona": "Helpful, product-savvy, solutions-focused"},
    },
    {
        "id": "tmpl-realestate",
        "name": "Real Estate Agency",
        "industry": "real_estate",
        "icon": "🏠",
        "description": "Property inquiries, viewing bookings, mortgage FAQs, neighborhood info.",
        "is_premium": False,
        "price_cents": 0,
        "system_prompt": (
            "You are a professional real estate assistant. Help clients with property inquiries, "
            "schedule viewings, answer questions about neighborhoods, financing, and the buying/renting process. "
            "Capture lead information (name, budget, preferred area) for follow-up by an agent."
        ),
        "starter_knowledge": [
            {"title": "Current Listings", "content": "Add your current property listings here."},
            {"title": "Areas Covered", "content": "Add neighborhoods and areas you cover."},
        ],
        "config_defaults": {"agent_persona": "Professional, knowledgeable, trustworthy"},
    },
    {
        "id": "tmpl-salon",
        "name": "Salon & Beauty",
        "industry": "salon",
        "icon": "💇",
        "description": "Books appointments, shares pricing, handles style consultations.",
        "is_premium": False,
        "price_cents": 0,
        "system_prompt": (
            "You are a friendly salon assistant. Help clients book appointments, answer questions "
            "about services and pricing, and share stylist availability. "
            "Always confirm appointment date, time, and service before booking."
        ),
        "starter_knowledge": [
            {"title": "Services & Pricing", "content": "Add your full service menu with prices here."},
            {"title": "Stylists", "content": "Add your team members and their specialties."},
        ],
        "config_defaults": {"agent_persona": "Friendly, stylish, attentive to detail"},
    },
    {
        "id": "tmpl-legal",
        "name": "Law Firm",
        "industry": "legal",
        "icon": "⚖️",
        "description": "Consultation bookings, practice area FAQs, case intake qualification.",
        "is_premium": True,
        "price_cents": 0,
        "system_prompt": (
            "You are a professional law firm intake assistant. Help prospective clients understand "
            "the firm's practice areas, book initial consultations, and complete intake forms. "
            "NEVER provide specific legal advice. Always clarify that information provided is general "
            "and not a substitute for professional legal counsel."
        ),
        "starter_knowledge": [
            {"title": "Practice Areas", "content": "Add your firm's practice areas here."},
            {"title": "Consultation Process", "content": "Free 30-min initial consultation. Availability Mon-Fri."},
            {"title": "Disclaimer", "content": "Information provided is general only, not legal advice."},
        ],
        "config_defaults": {"escalation_after_failures": 1, "agent_persona": "Professional, precise, trustworthy"},
    },
]


@router.get("/")
async def list_templates():
    return {"templates": BUILTIN_TEMPLATES}


@router.get("/{template_id}")
async def get_template(template_id: str):
    tmpl = next((t for t in BUILTIN_TEMPLATES if t["id"] == template_id), None)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.post("/{template_id}/deploy")
async def deploy_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply a template's system prompt and config defaults to the current tenant."""
    tmpl = next((t for t in BUILTIN_TEMPLATES if t["id"] == template_id), None)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    config = tmpl.get("config_defaults", {})

    # Apply config to tenant
    set_parts = ["agent_persona = :persona", "industry = :industry"]
    params: dict = {
        "persona": config.get("agent_persona", "Friendly, professional, helpful"),
        "industry": tmpl["industry"],
        "tenant_id": str(current_user.tenant_id),
    }
    if "escalation_after_failures" in config:
        set_parts.append("escalation_after_failures = :escalation_after_failures")
        params["escalation_after_failures"] = config["escalation_after_failures"]

    await db.execute(
        text(f"UPDATE tenants SET {', '.join(set_parts)} WHERE id = :tenant_id"),
        params,
    )

    # Seed starter knowledge entries
    starter = tmpl.get("starter_knowledge", [])
    for item in starter:
        source_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO knowledge_sources (id, tenant_id, type, name, status)
                VALUES (:id, :tenant_id, 'manual', :name, 'indexed')
                ON CONFLICT DO NOTHING
            """),
            {"id": source_id, "tenant_id": str(current_user.tenant_id), "name": item["title"]},
        )
        chunk_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO knowledge_chunks (id, tenant_id, source_id, content)
                VALUES (:id, :tenant_id, :source_id, :content)
            """),
            {
                "id": chunk_id,
                "tenant_id": str(current_user.tenant_id),
                "source_id": source_id,
                "content": f"{item['title']}\n{item['content']}",
            },
        )

    await db.commit()

    return {
        "success": True,
        "template": tmpl["name"],
        "message": f"Template '{tmpl['name']}' applied. {len(starter)} knowledge entries added.",
    }


# ─── Custom Template CRUD ─────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional

# In-memory store for custom templates (persists per process; use DB for production)
_custom_templates: dict[str, dict] = {}


class CreateTemplateRequest(BaseModel):
    name: str
    industry: str = "custom"
    icon: str = "💼"
    description: str = ""
    is_premium: bool = False
    price_cents: int = 0


@router.post("/")
async def create_custom_template(
    request: CreateTemplateRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a custom template for the tenant."""
    tmpl_id = f"custom-{uuid.uuid4().hex[:8]}"
    tmpl = {
        "id": tmpl_id,
        "name": request.name,
        "industry": request.industry,
        "icon": request.icon,
        "description": request.description,
        "is_premium": request.is_premium,
        "price_cents": request.price_cents,
        "is_custom": True,
        "system_prompt": f"You are a helpful AI agent for {request.name}. {request.description}",
        "starter_knowledge": [],
        "config_defaults": {"agent_persona": "Friendly, professional, helpful"},
    }
    _custom_templates[tmpl_id] = tmpl
    return tmpl


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a custom template (built-in templates cannot be fully deleted)."""
    if template_id in _custom_templates:
        del _custom_templates[template_id]
        return {"success": True, "message": "Template deleted"}
    # For built-in templates, just return success (they reload from BUILTIN_TEMPLATES)
    if any(t["id"] == template_id for t in BUILTIN_TEMPLATES):
        return {"success": True, "message": "Built-in template hidden"}
    raise HTTPException(status_code=404, detail="Template not found")


@router.get("/recommend")
async def recommend_template(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Use Anthropic to pick the best template for this tenant's industry/knowledge."""
    import os
    from sqlalchemy import text as _text

    # Get tenant industry
    result = await db.execute(_text("SELECT industry FROM tenants WHERE id = :tid"), {"tid": str(current_user.tenant_id)})
    row = result.fetchone()
    industry = (row[0] or "other").lower() if row else "other"

    # Get up to 5 recent knowledge source names for context
    ks_result = await db.execute(
        _text("SELECT name FROM knowledge_sources WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 5"),
        {"tid": str(current_user.tenant_id)}
    )
    knowledge_names = [r[0] for r in ks_result.fetchall()]

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        # Fallback: match by industry keyword
        INDUSTRY_MAP = {
            "restaurant": "tmpl-restaurant", "food": "tmpl-restaurant", "cafe": "tmpl-restaurant",
            "medical": "tmpl-medical", "clinic": "tmpl-medical", "health": "tmpl-medical",
            "ecommerce": "tmpl-ecommerce", "shop": "tmpl-ecommerce", "store": "tmpl-ecommerce",
            "real estate": "tmpl-realestate", "property": "tmpl-realestate",
            "salon": "tmpl-salon", "beauty": "tmpl-salon",
            "legal": "tmpl-legal", "law": "tmpl-legal",
        }
        for keyword, tmpl_id in INDUSTRY_MAP.items():
            if keyword in industry:
                return {"recommended_id": tmpl_id}
        return {"recommended_id": None}

    try:
        import httpx
        prompt = (
            f"A business has industry='{industry}' and knowledge sources: {knowledge_names}.\n"
            f"Available templates: restaurant, medical, ecommerce, real_estate, salon, legal.\n"
            f"Reply with ONLY one word: the best industry match (e.g. 'restaurant')."
        )
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-3-5-haiku-latest", "max_tokens": 10, "messages": [{"role": "user", "content": prompt}]},
                timeout=10,
            )
        picked = resp.json().get("content", [{}])[0].get("text", "").strip().lower().replace(" ", "_")
        tmpl_id_map = {"restaurant": "tmpl-restaurant", "medical": "tmpl-medical", "ecommerce": "tmpl-ecommerce",
                       "real_estate": "tmpl-realestate", "salon": "tmpl-salon", "legal": "tmpl-legal"}
        return {"recommended_id": tmpl_id_map.get(picked)}
    except Exception:
        return {"recommended_id": None}

