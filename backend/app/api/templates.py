"""
Agent Marketplace / Industry Templates API
────────────────────────────────────────────
GET  /api/templates          — list all templates
GET  /api/templates/recommend — AI-powered recommendation (must be before /{id})
GET  /api/templates/{id}     — get one template
POST /api/templates/{id}/deploy — clone template config to tenant
DELETE /api/templates/applied — remove applied template + seeded KB
DELETE /api/templates/hidden  — restore all hidden built-in templates
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant
from app.core.config import settings
from app.models.user import User
from app.models.tenant import Tenant

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
async def list_templates(
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    hidden = tenant.hidden_templates or []
    templates = [t for t in BUILTIN_TEMPLATES if t["id"] not in hidden]

    # Add custom templates from DB (wrapped so a missing table doesn't kill the response)
    try:
        result = await db.execute(
            text("SELECT * FROM agent_templates WHERE tenant_id = :tid ORDER BY created_at"),
            {"tid": str(tenant.id)},
        )
        for row in result.mappings().all():
            tmpl = dict(row)
            tmpl["id"] = str(tmpl["id"]) if tmpl.get("id") else tmpl["id"]
            tmpl["is_custom"] = True
            if tmpl["id"] not in hidden:
                templates.append(tmpl)
    except Exception:
        pass  # agent_templates table may not exist yet; built-ins still returned

    return {
        "templates": templates,
        "applied_template_id": tenant.applied_template_id,
        "hidden_count": len(hidden),
    }


# ─── IMPORTANT: /recommend and /applied must come BEFORE /{template_id} ───────

@router.get("/recommend")
async def recommend_template(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Use Anthropic to pick the best template for this tenant's industry/knowledge."""
    import os

    result = await db.execute(text("SELECT industry FROM tenants WHERE id = :tid"), {"tid": str(current_user.tenant_id)})
    row = result.fetchone()
    industry = (row[0] or "other").lower() if row else "other"

    ks_result = await db.execute(
        text("SELECT name FROM knowledge_sources WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 5"),
        {"tid": str(current_user.tenant_id)}
    )
    knowledge_names = [r[0] for r in ks_result.fetchall()]

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
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
                json={"model": settings.TEMPLATE_RECOMMEND_MODEL, "max_tokens": 10, "messages": [{"role": "user", "content": prompt}]},
                timeout=10,
            )
        picked = resp.json().get("content", [{}])[0].get("text", "").strip().lower().replace(" ", "_")
        tmpl_id_map = {"restaurant": "tmpl-restaurant", "medical": "tmpl-medical", "ecommerce": "tmpl-ecommerce",
                       "real_estate": "tmpl-realestate", "salon": "tmpl-salon", "legal": "tmpl-legal"}
        return {"recommended_id": tmpl_id_map.get(picked)}
    except Exception:
        return {"recommended_id": None}


@router.delete("/applied")
async def remove_applied_template(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the currently applied template: delete seeded KB items and reset persona/industry."""
    result = await db.execute(
        text("SELECT applied_template_id FROM tenants WHERE id = :tid"),
        {"tid": str(current_user.tenant_id)},
    )
    row = result.fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="No template currently applied")

    applied_id = row[0]

    # Delete knowledge_sources seeded by this template (chunks cascade via FK)
    await db.execute(
        text("""
            DELETE FROM knowledge_sources
            WHERE tenant_id = :tid
            AND source_meta->>'template_id' = :tmpl_id
        """),
        {"tid": str(current_user.tenant_id), "tmpl_id": applied_id},
    )

    # Reset persona/industry and clear applied_template_id
    await db.execute(
        text("UPDATE tenants SET applied_template_id = NULL, agent_persona = NULL, industry = NULL WHERE id = :tid"),
        {"tid": str(current_user.tenant_id)},
    )

    await db.commit()
    return {"success": True, "removed_template_id": applied_id}


@router.delete("/hidden")
async def restore_hidden_templates(
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Clear hidden_templates list so all built-in templates become visible again."""
    await db.execute(
        text("UPDATE tenants SET hidden_templates = '[]'::jsonb WHERE id = :tid"),
        {"tid": str(tenant.id)},
    )
    await db.commit()
    return {"success": True, "message": "All built-in templates restored"}


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tmpl = next((t for t in BUILTIN_TEMPLATES if t["id"] == template_id), None)
    if not tmpl:
        result = await db.execute(
            text("SELECT * FROM agent_templates WHERE id = :id AND tenant_id = :tid"),
            {"id": template_id, "tid": str(current_user.tenant_id)},
        )
        row = result.mappings().one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        tmpl = dict(row)
        tmpl["is_custom"] = True
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
        result = await db.execute(
            text("SELECT * FROM agent_templates WHERE id = :id AND tenant_id = :tid"),
            {"id": template_id, "tid": str(current_user.tenant_id)},
        )
        row = result.mappings().one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        tmpl = dict(row)
        import json as _json
        tmpl["starter_knowledge"] = _json.loads(tmpl["starter_knowledge"]) if isinstance(tmpl["starter_knowledge"], str) else (tmpl["starter_knowledge"] or [])
        tmpl["config_defaults"] = _json.loads(tmpl["config_defaults"]) if isinstance(tmpl["config_defaults"], str) else (tmpl["config_defaults"] or {})

    config = tmpl.get("config_defaults", {})

    set_parts = ["agent_persona = :persona", "industry = :industry", "applied_template_id = :tmpl_id"]
    params: dict = {
        "persona": config.get("agent_persona", "Friendly, professional, helpful"),
        "industry": tmpl["industry"],
        "tmpl_id": template_id,
        "tenant_id": str(current_user.tenant_id),
    }
    if "escalation_after_failures" in config:
        set_parts.append("escalation_after_failures = :escalation_after_failures")
        params["escalation_after_failures"] = config["escalation_after_failures"]

    await db.execute(
        text(f"UPDATE tenants SET {', '.join(set_parts)} WHERE id = :tenant_id"),
        params,
    )

    import json as _json
    starter = tmpl.get("starter_knowledge", [])
    for item in starter:
        source_id = str(uuid.uuid4())
        source_meta = _json.dumps({"template_id": template_id})
        await db.execute(
            text("""
                INSERT INTO knowledge_sources (id, tenant_id, type, name, status, source_meta)
                VALUES (:id, :tenant_id, 'manual', :name, 'indexed', :source_meta::jsonb)
                ON CONFLICT DO NOTHING
            """),
            {"id": source_id, "tenant_id": str(current_user.tenant_id), "name": item["title"], "source_meta": source_meta},
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
    db: AsyncSession = Depends(get_db),
):
    """Create a custom template for the tenant (persisted in DB)."""
    tmpl_id = f"custom-{uuid.uuid4().hex[:8]}"
    system_prompt = f"You are a helpful AI agent for {request.name}. {request.description}"
    await db.execute(
        text("""
            INSERT INTO agent_templates (id, tenant_id, name, industry, icon, description, is_premium, price_cents, system_prompt, starter_knowledge, config_defaults)
            VALUES (:id, :tenant_id, :name, :industry, :icon, :description, :is_premium, :price_cents, :system_prompt, :starter_knowledge::jsonb, :config_defaults::jsonb)
        """),
        {
            "id": tmpl_id,
            "tenant_id": str(current_user.tenant_id),
            "name": request.name,
            "industry": request.industry,
            "icon": request.icon,
            "description": request.description,
            "is_premium": request.is_premium,
            "price_cents": request.price_cents,
            "system_prompt": system_prompt,
            "starter_knowledge": "[]",
            "config_defaults": '{"agent_persona": "Friendly, professional, helpful"}',
        },
    )
    await db.commit()
    return {"id": tmpl_id, "name": request.name, "industry": request.industry, "icon": request.icon,
            "description": request.description, "is_premium": request.is_premium, "price_cents": request.price_cents,
            "is_custom": True, "system_prompt": system_prompt}


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Delete a custom template from DB. Built-in templates cannot be deleted."""
    result = await db.execute(
        text("SELECT id FROM agent_templates WHERE id = :id AND tenant_id = :tid"),
        {"id": template_id, "tid": str(tenant.id)},
    )
    if result.scalar_one_or_none():
        await db.execute(
            text("DELETE FROM agent_templates WHERE id = :id AND tenant_id = :tid"),
            {"id": template_id, "tid": str(tenant.id)},
        )
        await db.commit()
        return {"success": True, "message": "Custom template deleted"}

    raise HTTPException(status_code=400, detail="Built-in templates cannot be deleted. Use 'Remove Applied Template' to unapply.")
