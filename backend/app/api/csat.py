"""
CSAT Public Endpoint
─────────────────────
Public endpoint for customers to submit star ratings.
Called when customer replies with 1-5 to the CSAT WhatsApp message.
Also handles the webhook for CSAT score detection.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db, AsyncSessionLocal
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/csat", tags=["CSAT"])


class CSATResponse(BaseModel):
    conversation_id: str
    score: int          # 1-5


@router.post("/respond")
async def submit_csat(body: CSATResponse, db: AsyncSession = Depends(get_db)):
    """Public endpoint — customer submits their CSAT score."""
    if not 1 <= body.score <= 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")

    result = await db.execute(
        text("SELECT id, tenant_id FROM conversations WHERE id = :id"),
        {"id": body.conversation_id},
    )
    conv = result.mappings().one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    from app.services.csat import process_csat_response
    await process_csat_response(body.conversation_id, body.score, lambda: AsyncSessionLocal())

    return {"success": True, "message": "Thank you for your feedback!"}


@router.get("/stats")
async def csat_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard endpoint — CSAT stats for the current tenant."""
    result = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE csat_score IS NOT NULL) as total_rated,
                ROUND(AVG(csat_score) FILTER (WHERE csat_score IS NOT NULL), 2) as avg_score,
                COUNT(*) FILTER (WHERE csat_score = 5) as five_star,
                COUNT(*) FILTER (WHERE csat_score = 4) as four_star,
                COUNT(*) FILTER (WHERE csat_score = 3) as three_star,
                COUNT(*) FILTER (WHERE csat_score <= 2) as low_score,
                COUNT(*) FILTER (WHERE csat_requested_at IS NOT NULL) as requests_sent
            FROM conversations
            WHERE tenant_id = :tenant_id
              AND created_at >= NOW() - INTERVAL '30 days'
        """),
        {"tenant_id": str(current_user.tenant_id)},
    )
    row = result.mappings().one()
    total = row["total_rated"] or 1

    return {
        "avg_score": float(row["avg_score"] or 0),
        "total_rated": row["total_rated"] or 0,
        "requests_sent": row["requests_sent"] or 0,
        "response_rate": round((row["total_rated"] or 0) / max(row["requests_sent"] or 1, 1) * 100),
        "distribution": {
            "5": row["five_star"] or 0,
            "4": row["four_star"] or 0,
            "3": row["three_star"] or 0,
            "1_2": row["low_score"] or 0,
        },
    }
