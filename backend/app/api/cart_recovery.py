"""
Cart Recovery API
─────────────────
Read-only dashboard endpoints for cart recovery sequences.
Webhooks that create recoveries live in webhooks.py.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from loguru import logger

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_tenant

router = APIRouter(prefix="/api/cart-recovery", tags=["Cart Recovery"])


@router.get("/")
async def list_recoveries(
    status: str = None,
    limit: int = 50,
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """List all cart recovery sequences for this tenant."""
    try:
        query = """
            SELECT
                cr.id,
                cr.cart_data,
                cr.discount_code,
                cr.messages_sent,
                cr.status,
                cr.recovered_at,
                cr.created_at,
                c.name AS customer_name
            FROM cart_recoveries cr
            LEFT JOIN customers c ON c.id = cr.customer_id
            WHERE cr.tenant_id = :tenant_id
        """
        params: dict = {"tenant_id": str(tenant.id)}
        if status:
            query += " AND cr.status = :status"
            params["status"] = status
        query += " ORDER BY cr.created_at DESC LIMIT :limit"
        params["limit"] = limit

        result = await db.execute(text(query), params)
        rows = result.fetchall()

        recoveries = []
        for row in rows:
            cart_data = row.cart_data or {}
            total = 0.0
            currency = "USD"
            if isinstance(cart_data, dict):
                items = cart_data.get("items", [])
                currency = cart_data.get("currency", "USD")
                for item in items:
                    try:
                        total += float(item.get("price", 0)) * int(item.get("quantity", 1))
                    except (ValueError, TypeError):
                        pass

            recoveries.append({
                "id": str(row.id),
                "customer_name": row.customer_name or "Anonymous",
                "cart_total": round(total, 2),
                "currency": currency,
                "cart_data": cart_data,
                "messages_sent": row.messages_sent or 0,
                "status": row.status or "in_progress",
                "recovered_at": row.recovered_at.isoformat() if row.recovered_at else None,
                "created_at": row.created_at.isoformat() if row.created_at else "",
            })

        return {"recoveries": recoveries}

    except Exception as e:
        logger.error(f"Cart recovery list failed: {e}")
        return {"recoveries": []}


@router.get("/stats")
async def recovery_stats(
    current_user=Depends(get_current_user),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate stats: total, recovered count, estimated revenue recovered."""
    try:
        result = await db.execute(
            text("""
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) AS recovered
                FROM cart_recoveries
                WHERE tenant_id = :tenant_id
            """),
            {"tenant_id": str(tenant.id)},
        )
        row = result.fetchone()
        total = row.total or 0
        recovered = row.recovered or 0
        rate = round((recovered / total) * 100) if total else 0
        return {"total": total, "recovered": recovered, "rate": rate}
    except Exception as e:
        logger.error(f"Cart recovery stats failed: {e}")
        return {"total": 0, "recovered": 0, "rate": 0}
