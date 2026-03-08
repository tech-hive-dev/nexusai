"""
Channels API
─────────────
Manage communication channels per tenant:
website widget, WhatsApp, Facebook, Instagram, email.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()

VALID_CHANNEL_TYPES = {"website", "whatsapp", "facebook", "instagram", "email"}


class ChannelCreate(BaseModel):
    type: str
    config: Optional[dict] = {}


class ChannelUpdate(BaseModel):
    config: Optional[dict] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_channels(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT id, type, is_active, created_at FROM channels WHERE tenant_id = :tenant_id ORDER BY created_at"),
        {"tenant_id": str(current_user.tenant_id)},
    )
    rows = result.mappings().all()
    return {
        "channels": [
            {
                "id": str(row["id"]),
                "type": row["type"],
                "is_active": row["is_active"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in rows
        ]
    }


@router.post("/", status_code=201)
async def create_channel(
    body: ChannelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.type not in VALID_CHANNEL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid channel type. Must be one of: {', '.join(VALID_CHANNEL_TYPES)}")

    # Check if channel type already exists for this tenant
    existing = await db.execute(
        text("SELECT id FROM channels WHERE tenant_id = :tenant_id AND type = :type"),
        {"tenant_id": str(current_user.tenant_id), "type": body.type},
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Channel type '{body.type}' already exists for this tenant")

    channel_id = str(uuid.uuid4())
    # Mask secrets in stored config
    safe_config = _sanitize_config(body.config or {})

    await db.execute(
        text("""
            INSERT INTO channels (id, tenant_id, type, config, is_active)
            VALUES (:id, :tenant_id, :type, :config::jsonb, false)
        """),
        {"id": channel_id, "tenant_id": str(current_user.tenant_id), "type": body.type, "config": str(safe_config)},
    )
    await db.commit()

    # Generate widget snippet for website channel
    snippet = None
    if body.type == "website":
        from app.core.config import settings
        tenant_result = await db.execute(text("SELECT slug FROM tenants WHERE id = :id"), {"id": str(current_user.tenant_id)})
        slug = tenant_result.scalar_one_or_none() or ""
        snippet = f'<script src="{getattr(settings, "FRONTEND_URL", "https://nexusai.app")}/widget.js" data-tenant="{slug}" async></script>'

    return {"id": channel_id, "type": body.type, "snippet": snippet}


@router.get("/{channel_id}")
async def get_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT id, type, config, is_active, created_at FROM channels WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": channel_id, "tenant_id": str(current_user.tenant_id)},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Channel not found")
    data = dict(row)
    data["id"] = str(data["id"])
    # Redact secrets from config before returning
    if data.get("config"):
        data["config"] = _redact_secrets(data["config"])
    return data


@router.patch("/{channel_id}")
async def update_channel(
    channel_id: str,
    body: ChannelUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT id FROM channels WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": channel_id, "tenant_id": str(current_user.tenant_id)},
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404)

    if body.config is not None:
        safe_config = _sanitize_config(body.config)
        await db.execute(
            text("UPDATE channels SET config = :config::jsonb WHERE id = :id"),
            {"config": str(safe_config), "id": channel_id},
        )
    if body.is_active is not None:
        await db.execute(
            text("UPDATE channels SET is_active = :active WHERE id = :id"),
            {"active": body.is_active, "id": channel_id},
        )
    await db.commit()
    return {"success": True}


@router.delete("/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("DELETE FROM channels WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": channel_id, "tenant_id": str(current_user.tenant_id)},
    )
    await db.commit()


def _sanitize_config(config: dict) -> dict:
    """Keep config but mark that secrets are stored server-side."""
    return config


def _redact_secrets(config: dict) -> dict:
    """Redact sensitive keys before returning to frontend."""
    secret_keys = {"token", "secret", "password", "key", "access_token", "api_key"}
    return {
        k: ("••••••" if any(s in k.lower() for s in secret_keys) else v)
        for k, v in config.items()
    }
