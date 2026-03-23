"""
Super Admin API
───────────────
Platform-owner endpoints to manage all tenants.
Auth: X-Admin-Key header must match ADMIN_SECRET_KEY env var.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, text
from pydantic import BaseModel
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.models.tenant import Tenant
from app.models.user import User
from app.models.knowledge import KnowledgeSource, KnowledgeChunk

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ─── AUTH ─────────────────────────────────────────────────────

def require_admin(x_admin_key: str = Header(...)):
    if x_admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")


# ─── SCHEMAS ──────────────────────────────────────────────────

class UpdatePlanRequest(BaseModel):
    plan: Optional[str] = None          # starter / growth / business
    plan_status: Optional[str] = None   # trial / active / suspended
    conversation_limit: Optional[int] = None
    is_active: Optional[bool] = None


# ─── ENDPOINTS ────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Global platform stats."""
    try:
        row = (await db.execute(
            select(
                func.count(Tenant.id).label("total"),
                func.sum(func.cast(Tenant.is_active, db.bind.dialect.name == "postgresql" and "int" or "integer")).label("active"),
                func.sum(Tenant.conversation_count).label("total_conversations"),
            )
        )).mappings().one()

        by_plan = (await db.execute(
            select(Tenant.plan, func.count(Tenant.id).label("count"))
            .group_by(Tenant.plan)
        )).mappings().all()

        by_status = (await db.execute(
            select(Tenant.plan_status, func.count(Tenant.id).label("count"))
            .group_by(Tenant.plan_status)
        )).mappings().all()

        return {
            "total_tenants": row["total"] or 0,
            "total_conversations": int(row["total_conversations"] or 0),
            "by_plan": {r["plan"] or "unknown": r["count"] for r in by_plan},
            "by_status": {r["plan_status"] or "unknown": r["count"] for r in by_status},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/tenants")
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
    search: Optional[str] = None,
    plan: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """List all tenants with their owner email and key stats."""
    try:
        query = (
            select(Tenant, User.email, User.full_name)
            .outerjoin(User, (User.tenant_id == Tenant.id) & (User.role == "owner"))
            .order_by(Tenant.created_at.desc())
        )

        if search:
            query = query.where(
                Tenant.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
            )
        if plan:
            query = query.where(Tenant.plan == plan)

        total_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(total_q)).scalar() or 0

        rows = (await db.execute(query.limit(limit).offset(offset))).all()

        tenants = []
        for row in rows:
            tenant, email, full_name = row
            tenants.append({
                "id": str(tenant.id),
                "name": tenant.name,
                "slug": tenant.slug,
                "industry": tenant.industry,
                "owner_email": email or "—",
                "owner_name": full_name or "—",
                "plan": tenant.plan or "starter",
                "plan_status": tenant.plan_status or "trial",
                "is_active": tenant.is_active,
                "conversation_count": tenant.conversation_count or 0,
                "conversation_limit": tenant.conversation_limit or 500,
                "onboarding_completed": tenant.onboarding_completed,
                "applied_template_id": tenant.applied_template_id,
                "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
            })

        return {"tenants": tenants, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.get("/tenants/{tenant_id}")
async def get_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Get a single tenant's full details."""
    try:
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        user_result = await db.execute(
            select(User).where(User.tenant_id == tenant_id, User.role == "owner")
        )
        user = user_result.scalar_one_or_none()

        kb_count = (await db.execute(
            select(func.count(KnowledgeSource.id)).where(KnowledgeSource.tenant_id == tenant_id)
        )).scalar() or 0

        return {
            "id": str(tenant.id),
            "name": tenant.name,
            "slug": tenant.slug,
            "industry": tenant.industry,
            "owner_email": user.email if user else "—",
            "owner_name": user.full_name if user else "—",
            "plan": tenant.plan,
            "plan_status": tenant.plan_status,
            "is_active": tenant.is_active,
            "conversation_count": tenant.conversation_count or 0,
            "conversation_limit": tenant.conversation_limit or 500,
            "onboarding_completed": tenant.onboarding_completed,
            "onboarding_step": tenant.onboarding_step,
            "applied_template_id": tenant.applied_template_id,
            "stripe_customer_id": tenant.stripe_customer_id,
            "stripe_subscription_id": tenant.stripe_subscription_id,
            "knowledge_sources": kb_count,
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.patch("/tenants/{tenant_id}")
async def update_tenant(
    tenant_id: str,
    body: UpdatePlanRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Update plan, status, limits, or active flag."""
    try:
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        if body.plan is not None:
            tenant.plan = body.plan
            # Auto-set limit based on plan
            if body.conversation_limit is None:
                limits = {"starter": 500, "growth": 2000, "business": 10000}
                tenant.conversation_limit = limits.get(body.plan, 500)
        if body.plan_status is not None:
            tenant.plan_status = body.plan_status
        if body.conversation_limit is not None:
            tenant.conversation_limit = body.conversation_limit
        if body.is_active is not None:
            tenant.is_active = body.is_active

        await db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/tenants/{tenant_id}/reset")
async def reset_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Reset a tenant without deleting their account.
    Clears: knowledge base, applied template, resets onboarding.
    Keeps: account, users, conversations history, plan.
    """
    try:
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        # Delete knowledge chunks first (FK), then sources
        await db.execute(
            delete(KnowledgeChunk).where(
                KnowledgeChunk.source_id.in_(
                    select(KnowledgeSource.id).where(KnowledgeSource.tenant_id == tenant_id)
                )
            )
        )
        await db.execute(
            delete(KnowledgeSource).where(KnowledgeSource.tenant_id == tenant_id)
        )

        # Reset template + onboarding
        tenant.applied_template_id = None
        tenant.hidden_templates = []
        tenant.onboarding_completed = False
        tenant.onboarding_step = 1
        tenant.conversation_count = 0

        await db.commit()
        return {"success": True, "message": "Tenant reset — knowledge base cleared, onboarding reset"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.delete("/tenants/{tenant_id}", status_code=204)
async def delete_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Permanently delete a tenant and ALL their data.
    This is irreversible. The tenant can re-register with the same email after.
    """
    try:
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        # Delete via raw SQL for speed — FK cascades handle children
        await db.execute(text("DELETE FROM users WHERE tenant_id = :tid"), {"tid": tenant_id})
        await db.execute(text("DELETE FROM knowledge_chunks WHERE source_id IN (SELECT id FROM knowledge_sources WHERE tenant_id = :tid)"), {"tid": tenant_id})
        await db.execute(text("DELETE FROM knowledge_sources WHERE tenant_id = :tid"), {"tid": tenant_id})
        await db.execute(text("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE tenant_id = :tid)"), {"tid": tenant_id})
        await db.execute(text("DELETE FROM conversations WHERE tenant_id = :tid"), {"tid": tenant_id})
        await db.execute(text("DELETE FROM customers WHERE tenant_id = :tid"), {"tid": tenant_id})
        await db.execute(text("DELETE FROM leads WHERE tenant_id = :tid"), {"tid": tenant_id})
        await db.execute(text("DELETE FROM tenants WHERE id = :tid"), {"tid": tenant_id})

        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
