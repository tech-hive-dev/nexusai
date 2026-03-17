from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant
from app.models.tenant import Tenant
from app.core.config import settings
from loguru import logger

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
    request: Request,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Get the embed snippet for website integration"""
    import os
    # Derive backend_url from the incoming request host (most reliable)
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    backend_url = f"{forwarded_proto}://{forwarded_host}"

    # Fallback chain if we somehow got localhost
    if not backend_url or "localhost" in backend_url:
        import os as _os
        public_domain = _os.getenv("RAILWAY_PUBLIC_DOMAIN")
        backend_url = f"https://{public_domain}" if public_domain else settings.BACKEND_URL

    logger.info(f"Serving embed code with backend_url: {backend_url}")
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


class IndustryTemplateRequest(BaseModel):
    industry: str


@router.post("/industry-template")
async def apply_industry_template(
    body: IndustryTemplateRequest,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Apply a pre-built industry template to the tenant's knowledge base."""
    from app.services.industry_templates import apply_industry_template
    result = await apply_industry_template(
        tenant_id=str(tenant.id),
        industry=body.industry,
        db=db,
    )
    return result
