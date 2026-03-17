"""
WhatsApp Campaigns Service
───────────────────────────
Executes broadcast campaigns and follow-up sequences stored in the
campaigns / campaign_contacts tables.
"""
from datetime import datetime
from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def send_campaign(campaign_id: str, db: AsyncSession) -> dict:
    """Send all pending contacts in a campaign via WhatsApp."""
    from app.services.whatsapp_sender import send_text_message

    # Load campaign
    result = await db.execute(
        text("SELECT * FROM campaigns WHERE id = :id"),
        {"id": campaign_id},
    )
    campaign = result.mappings().one_or_none()
    if not campaign:
        return {"success": False, "error": "Campaign not found"}
    if campaign["status"] == "complete":
        return {"success": False, "error": "Campaign already sent"}

    # Mark as sending
    await db.execute(
        text("UPDATE campaigns SET status = 'sending' WHERE id = :id"),
        {"id": campaign_id},
    )
    await db.commit()

    # Fetch unsent contacts
    contacts_result = await db.execute(
        text("""
            SELECT id, phone, name, company
            FROM campaign_contacts
            WHERE campaign_id = :cid AND sent_at IS NULL
        """),
        {"cid": campaign_id},
    )
    contacts = contacts_result.mappings().all()

    sent = 0
    for contact in contacts:
        try:
            msg = campaign["message_template"].format(
                name=contact["name"] or "there",
                company=contact["company"] or "",
            )
            ok = await send_text_message(contact["phone"], msg)
            if ok:
                await db.execute(
                    text("UPDATE campaign_contacts SET sent_at = NOW() WHERE id = :id"),
                    {"id": str(contact["id"])},
                )
                sent += 1
        except Exception as e:
            logger.warning(f"Campaign contact {contact['id']} failed: {e}")
            continue

    await db.execute(
        text("""
            UPDATE campaigns
            SET status = 'complete', sent_count = :sent, completed_at = NOW()
            WHERE id = :id
        """),
        {"sent": str(sent), "id": campaign_id},
    )
    await db.commit()
    logger.info(f"Campaign {campaign_id} sent to {sent}/{len(contacts)} contacts")
    return {"success": True, "sent": sent, "total": len(contacts)}


async def send_followup_sequence(
    lead_phone: str,
    lead_name: str,
    tenant_id: str,
    tenant_name: str,
) -> None:
    """Schedule 3 follow-up messages for a hot/warm lead via Celery."""
    try:
        from app.workers.tasks import send_followup_message
        messages = [
            (2,  f"Hi {lead_name}! Just following up on your enquiry with {tenant_name}. Can we help you move forward? 😊"),
            (24, f"Hi {lead_name}, we're still here and happy to answer any questions about {tenant_name}. What can we help you with?"),
            (72, f"Hi {lead_name}! Last follow-up from {tenant_name} — we'd love to help you. Let us know if you're ready to proceed! 🙌"),
        ]
        for hours, msg in messages:
            send_followup_message.apply_async(
                args=[lead_phone, msg],
                countdown=hours * 3600,
            )
    except Exception as e:
        logger.warning(f"Could not schedule follow-up sequence: {e}")
