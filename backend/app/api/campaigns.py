"""
Campaigns API
─────────────
CRUD for WhatsApp broadcast campaigns + contact management + send action.
"""
import csv
import io
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_tenant

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str
    message_template: str
    campaign_type: str = "broadcast"
    scheduled_at: Optional[str] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    message_template: Optional[str] = None
    scheduled_at: Optional[str] = None


@router.get("/")
async def list_campaigns(
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT c.id, c.name, c.campaign_type, c.status, c.sent_count,
                   c.scheduled_at, c.completed_at, c.created_at,
                   COUNT(cc.id) AS contact_count
            FROM campaigns c
            LEFT JOIN campaign_contacts cc ON cc.campaign_id = c.id
            WHERE c.tenant_id = :tid
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """),
        {"tid": str(tenant.id)},
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]


@router.post("/")
async def create_campaign(
    body: CampaignCreate,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    cid = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO campaigns (id, tenant_id, name, message_template, campaign_type, scheduled_at)
            VALUES (:id, :tid, :name, :template, :type, :scheduled)
        """),
        {
            "id": cid,
            "tid": str(tenant.id),
            "name": body.name,
            "template": body.message_template,
            "type": body.campaign_type,
            "scheduled": body.scheduled_at,
        },
    )
    await db.commit()
    return {"id": cid, "name": body.name, "status": "draft"}


@router.patch("/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    body: CampaignUpdate,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    sets = []
    params: dict = {"id": campaign_id, "tid": str(tenant.id)}
    if body.name is not None:
        sets.append("name = :name"); params["name"] = body.name
    if body.message_template is not None:
        sets.append("message_template = :template"); params["template"] = body.message_template
    if body.scheduled_at is not None:
        sets.append("scheduled_at = :scheduled"); params["scheduled"] = body.scheduled_at
    if not sets:
        raise HTTPException(400, "Nothing to update")
    await db.execute(
        text(f"UPDATE campaigns SET {', '.join(sets)} WHERE id = :id AND tenant_id = :tid"),
        params,
    )
    await db.commit()
    return {"success": True}


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("DELETE FROM campaigns WHERE id = :id AND tenant_id = :tid"),
        {"id": campaign_id, "tid": str(tenant.id)},
    )
    await db.commit()
    return {"success": True}


@router.get("/{campaign_id}/contacts")
async def list_contacts(
    campaign_id: str,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT cc.id, cc.phone, cc.name, cc.company, cc.sent_at, cc.delivered, cc.replied
            FROM campaign_contacts cc
            JOIN campaigns c ON c.id = cc.campaign_id
            WHERE cc.campaign_id = :cid AND c.tenant_id = :tid
            ORDER BY cc.name ASC
        """),
        {"cid": campaign_id, "tid": str(tenant.id)},
    )
    return [dict(r) for r in result.mappings().all()]


@router.post("/{campaign_id}/contacts/upload")
async def upload_contacts(
    campaign_id: str,
    file: UploadFile = File(...),
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CSV with columns: phone, name, company (optional)."""
    # Verify campaign belongs to tenant
    result = await db.execute(
        text("SELECT id FROM campaigns WHERE id = :id AND tenant_id = :tid"),
        {"id": campaign_id, "tid": str(tenant.id)},
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Campaign not found")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    added = 0
    for row in reader:
        phone = (row.get("phone") or row.get("Phone") or "").strip()
        if not phone:
            continue
        await db.execute(
            text("""
                INSERT INTO campaign_contacts (id, campaign_id, phone, name, company)
                VALUES (:id, :cid, :phone, :name, :company)
                ON CONFLICT DO NOTHING
            """),
            {
                "id": str(uuid.uuid4()),
                "cid": campaign_id,
                "phone": phone,
                "name": (row.get("name") or row.get("Name") or "").strip() or None,
                "company": (row.get("company") or row.get("Company") or "").strip() or None,
            },
        )
        added += 1
    await db.commit()
    return {"added": added}


@router.post("/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    tenant=Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Trigger immediate send for a campaign."""
    result = await db.execute(
        text("SELECT id, status FROM campaigns WHERE id = :id AND tenant_id = :tid"),
        {"id": campaign_id, "tid": str(tenant.id)},
    )
    campaign = result.mappings().one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign["status"] == "complete":
        raise HTTPException(400, "Campaign already sent")

    from app.services.whatsapp_campaigns import send_campaign as execute
    result = await execute(campaign_id, db)
    return result
