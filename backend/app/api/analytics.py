from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant
from app.models.conversation import Conversation
from app.models.customer import Customer
from app.models.appointment import Appointment

router = APIRouter()

@router.get("/overview")
async def get_overview(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    total_convs = await db.scalar(
        select(func.count(Conversation.id)).where(Conversation.tenant_id == tenant.id)
    )
    resolved = await db.scalar(
        select(func.count(Conversation.id)).where(
            Conversation.tenant_id == tenant.id,
            Conversation.status == "resolved",
        )
    )
    total_leads = await db.scalar(
        select(func.count(Customer.id)).where(
            Customer.tenant_id == tenant.id,
            Customer.email.isnot(None),
        )
    )
    appointments = await db.scalar(
        select(func.count(Appointment.id)).where(Appointment.tenant_id == tenant.id)
    )

    resolution_rate = round((resolved / total_convs * 100) if total_convs else 0, 1)

    return {
        "total_conversations": total_convs or 0,
        "resolved_conversations": resolved or 0,
        "resolution_rate": resolution_rate,
        "total_leads": total_leads or 0,
        "appointments_booked": appointments or 0,
        "conversation_limit": tenant.conversation_limit,
        "conversations_used": tenant.conversation_count,
    }


@router.get("/trend")
async def get_trend(
    days: int = 7,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Daily conversation counts for the last N days."""
    result = await db.execute(
        text("""
            SELECT DATE(created_at) AS day, COUNT(*) AS count
            FROM conversations
            WHERE tenant_id = :tenant_id
              AND created_at >= NOW() - (:days || ' days')::INTERVAL
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """),
        {"tenant_id": str(tenant.id), "days": days},
    )
    return {"trend": [{"day": str(r.day), "count": r.count} for r in result.fetchall()]}


@router.get("/channels")
async def get_channel_breakdown(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Conversation count per channel."""
    result = await db.execute(
        text("""
            SELECT channel, COUNT(*) AS count
            FROM conversations
            WHERE tenant_id = :tenant_id
            GROUP BY channel ORDER BY count DESC
        """),
        {"tenant_id": str(tenant.id)},
    )
    return {"channels": [{"channel": r.channel, "count": r.count} for r in result.fetchall()]}


@router.get("/sentiment")
async def get_sentiment_breakdown(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Conversation count per sentiment (last 30 days)."""
    result = await db.execute(
        text("""
            SELECT sentiment, COUNT(*) AS count
            FROM conversations
            WHERE tenant_id = :tenant_id
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY sentiment ORDER BY count DESC
        """),
        {"tenant_id": str(tenant.id)},
    )
    return {"sentiment": [{"sentiment": r.sentiment, "count": r.count} for r in result.fetchall()]}
@router.get("/ltv")
async def get_ltv_trend(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Monthly aggregate LTV trend."""
    result = await db.execute(
        text("""
            SELECT DATE_TRUNC('month', created_at) AS month, SUM(ltv) AS total_ltv
            FROM customers
            WHERE tenant_id = :tenant_id
            GROUP BY month ORDER BY month ASC
        """),
        {"tenant_id": str(tenant.id)},
    )
    return {"ltv_trend": [{"month": str(r.month), "total": float(r.total_ltv or 0)} for r in result.fetchall()]}


@router.get("/churn")
async def get_churn_stats(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Count of customers per churn risk level."""
    result = await db.execute(
        text("""
            SELECT churn_risk, COUNT(*) AS count
            FROM customers
            WHERE tenant_id = :tenant_id
            GROUP BY churn_risk
        """),
        {"tenant_id": str(tenant.id)},
    )
    return {"churn_segments": {r.churn_risk: r.count for r in result.fetchall()}}
