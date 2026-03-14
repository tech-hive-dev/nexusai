"""
Broadcasts API
──────────────
Campaign management: create, schedule, send WhatsApp/email broadcasts
to customer segments.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from typing import Optional, List
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()


class BroadcastCreate(BaseModel):
    name: str
    type: str                           # whatsapp | email
    subject: Optional[str] = None       # email only
    content: str
    target_filter: Optional[dict] = {}  # {tags: [...], channel: "...", last_seen_days: 30}
    scheduled_at: Optional[str] = None  # ISO datetime or null for immediate


class BroadcastUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    target_filter: Optional[dict] = None
    scheduled_at: Optional[str] = None


@router.get("/")
async def list_broadcasts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    result = await db.execute(
        text("""
            SELECT id, name, type, subject, status, recipient_count, sent_count,
                   scheduled_at, sent_at, created_at
            FROM broadcasts
            WHERE tenant_id = :tenant_id
            ORDER BY created_at DESC
            LIMIT 100
        """),
        {"tenant_id": str(current_user.tenant_id)},
    )
    rows = result.mappings().all()
    return {
        "broadcasts": [
            {
                **dict(row),
                "id": str(row["id"]),
                "scheduled_at": row["scheduled_at"].isoformat() if row["scheduled_at"] else None,
                "sent_at": row["sent_at"].isoformat() if row["sent_at"] else None,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in rows
        ]
    }


@router.post("/", status_code=201)
async def create_broadcast(
    body: BroadcastCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    from datetime import datetime

    # Count matching recipients
    recipient_count = await _count_recipients(str(current_user.tenant_id), body.target_filter or {}, db)

    broadcast_id = str(uuid.uuid4())
    scheduled_at = None
    if body.scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(body.scheduled_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scheduled_at format. Use ISO datetime.")

    await db.execute(
        text("""
            INSERT INTO broadcasts (id, tenant_id, name, type, subject, content, target_filter,
                                    status, recipient_count, scheduled_at)
            VALUES (:id, :tenant_id, :name, :type, :subject, :content, :target_filter::jsonb,
                    :status, :recipient_count, :scheduled_at)
        """),
        {
            "id": broadcast_id,
            "tenant_id": str(current_user.tenant_id),
            "name": body.name,
            "type": body.type,
            "subject": body.subject,
            "content": body.content,
            "target_filter": str(body.target_filter or {}),
            "status": "scheduled" if scheduled_at else "draft",
            "recipient_count": recipient_count,
            "scheduled_at": scheduled_at,
        },
    )
    await db.commit()

    # If no scheduled time, it stays draft. If scheduled in the past, send now.
    if scheduled_at and scheduled_at <= datetime.utcnow():
        from app.workers.tasks import send_broadcast
        send_broadcast.delay(broadcast_id)

    return {"id": broadcast_id, "recipient_count": recipient_count}


@router.get("/{broadcast_id}")
async def get_broadcast(
    broadcast_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT * FROM broadcasts WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": broadcast_id, "tenant_id": str(current_user.tenant_id)},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    return dict(row)


@router.patch("/{broadcast_id}")
async def update_broadcast(
    broadcast_id: str,
    body: BroadcastUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    # Verify ownership + not already sent
    result = await db.execute(
        text("SELECT status FROM broadcasts WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": broadcast_id, "tenant_id": str(current_user.tenant_id)},
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404)
    if row[0] in ("sending", "sent"):
        raise HTTPException(status_code=400, detail="Cannot edit a broadcast that is sending or already sent")

    _ALLOWED_UPDATE_COLS = {"name", "content", "subject", "target_filter", "scheduled_at"}
    updates = {
        k: v for k, v in body.model_dump().items()
        if v is not None and k in _ALLOWED_UPDATE_COLS
    }
    if not updates:
        return {"success": True}

    set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
    await db.execute(
        text(f"UPDATE broadcasts SET {set_clauses} WHERE id = :id AND tenant_id = :tenant_id"),
        {**updates, "id": broadcast_id, "tenant_id": str(current_user.tenant_id)},
    )
    await db.commit()
    return {"success": True}


@router.post("/{broadcast_id}/send")
async def send_broadcast_now(
    broadcast_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Immediately dispatch a broadcast campaign."""
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT status FROM broadcasts WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": broadcast_id, "tenant_id": str(current_user.tenant_id)},
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404)
    if row[0] == "sent":
        raise HTTPException(status_code=400, detail="Already sent")

    from app.workers.tasks import send_broadcast
    send_broadcast.delay(broadcast_id)

    await db.execute(
        text("UPDATE broadcasts SET status = 'sending' WHERE id = :id"),
        {"id": broadcast_id},
    )
    await db.commit()
    return {"success": True, "message": "Broadcast queued for delivery"}


@router.delete("/{broadcast_id}", status_code=204)
async def delete_broadcast(
    broadcast_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    await db.execute(
        text("DELETE FROM broadcasts WHERE id = :id AND tenant_id = :tenant_id AND status IN ('draft', 'scheduled')"),
        {"id": broadcast_id, "tenant_id": str(current_user.tenant_id)},
    )
    await db.commit()


async def _count_recipients(tenant_id: str, target_filter: dict, db: AsyncSession) -> int:
    from sqlalchemy import text
    where = ["tenant_id = :tenant_id"]
    params: dict = {"tenant_id": tenant_id}

    if target_filter.get("channel"):
        where.append("channel = :channel")
        params["channel"] = target_filter["channel"]

    if target_filter.get("last_seen_days"):
        where.append("last_seen_at >= NOW() - make_interval(days => :days)")
        params["days"] = int(target_filter["last_seen_days"])

    if target_filter.get("tags"):
        where.append("tags && :tags")
        params["tags"] = target_filter["tags"]

    result = await db.execute(
        text(f"SELECT COUNT(*) FROM customers WHERE {' AND '.join(where)}"),
        params,
    )
    return result.scalar() or 0
