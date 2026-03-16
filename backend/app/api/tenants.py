from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant
from app.models.tenant import Tenant

router = APIRouter()


class UpdateTenantRequest(BaseModel):
    name: Optional[str] = None
    agent_name: Optional[str] = None
    agent_persona: Optional[str] = None
    industry: Optional[str] = None
    language_default: Optional[str] = None
    language_fallback: Optional[str] = None
    brand_color: Optional[str] = None
    escalation_email: Optional[str] = None
    business_hours: Optional[dict] = None
    onboarding_step: Optional[int] = None
    onboarding_completed: Optional[bool] = None


@router.get("/settings")
async def get_settings(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug,
        "agent_name": tenant.agent_name,
        "agent_persona": tenant.agent_persona,
        "industry": tenant.industry,
        "language_default": tenant.language_default,
        "language_fallback": tenant.language_fallback,
        "brand_color": tenant.brand_color,
        "escalation_email": tenant.escalation_email,
        "business_hours": tenant.business_hours,
        "plan": tenant.plan,
        "plan_status": tenant.plan_status,
        "conversation_count": tenant.conversation_count,
        "conversation_limit": tenant.conversation_limit,
        "onboarding_completed": tenant.onboarding_completed,
        "onboarding_step": tenant.onboarding_step,
    }


@router.patch("/settings")
async def update_settings(
    request: UpdateTenantRequest,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    for field, value in request.dict(exclude_none=True).items():
        setattr(tenant, field, value)
    await db.commit()
    return {"success": True, "message": "Settings updated"}


@router.get("/embed-code")
async def get_embed_code(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get the embed snippet for website integration"""
    import os
    backend_url = (
        os.getenv("BACKEND_URL")
        or (f"https://{os.getenv('RAILWAY_PUBLIC_DOMAIN')}" if os.getenv("RAILWAY_PUBLIC_DOMAIN") else None)
        or "https://wonderful-strength-production-a598.up.railway.app"
    )
    code = f"""<!-- NexusAI Chat Widget -->
<script>
  window.NexusAIConfig = {{
    tenantSlug: "{tenant.slug}",
    agentName: "{tenant.agent_name}",
    brandColor: "{tenant.brand_color}",
    apiUrl: "{backend_url}"
  }};
</script>
<script src="{backend_url}/widget/nexusai.js" async></script>"""
    return {"code": code, "tenant_slug": tenant.slug}
