"""
SLA Monitoring Service
──────────────────────
Detects SLA breaches (no first response within tenant's SLA window)
and sends Slack/email alerts. Runs every 60 seconds via Celery beat.
"""
from datetime import datetime, timedelta
from loguru import logger

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from app.models.tenant import Tenant
from app.models.conversation import Conversation


async def check_and_notify_breaches(db_factory) -> None:
    """
    Check open conversations that haven't received a first response
    within the tenant's SLA window. Mark breached + notify.
    """
    async with db_factory() as db:
        # Get all active tenants with SLA config
        tenants_result = await db.execute(
            select(Tenant).where(Tenant.is_active == True)
        )
        tenants = tenants_result.scalars().all()

        for tenant in tenants:
            try:
                sla_minutes = getattr(tenant, "sla_minutes", 5) or 5
                breach_cutoff = datetime.utcnow() - timedelta(minutes=sla_minutes)

                # Find open conversations past SLA window, not yet marked breached
                result = await db.execute(
                    select(Conversation).where(
                        and_(
                            Conversation.tenant_id == tenant.id,
                            Conversation.status == "open",
                            Conversation.created_at <= breach_cutoff,
                            Conversation.sla_breached == False,
                        )
                    )
                )
                breached = result.scalars().all()

                if not breached:
                    continue

                # Mark all as breached
                for conv in breached:
                    conv.sla_breached = True

                await db.commit()

                # Send Slack notification if configured
                slack_url = getattr(tenant, "slack_webhook_url", None)
                if slack_url and breached:
                    await _notify_slack(
                        webhook_url=slack_url,
                        tenant_name=tenant.name,
                        breach_count=len(breached),
                        sla_minutes=sla_minutes,
                    )

                logger.info(f"SLA: {len(breached)} breaches found for tenant {tenant.slug}")
            except Exception as e:
                logger.error(f"SLA check failed for tenant {tenant.slug}: {e}")


async def _notify_slack(webhook_url: str, tenant_name: str, breach_count: int, sla_minutes: int) -> None:
    """Post SLA breach alert to Slack webhook."""
    try:
        import httpx
        emoji = "🚨" if breach_count >= 5 else "⚠️"
        payload = {
            "text": (
                f"{emoji} *SLA Breach Alert — {tenant_name}*\n"
                f"{breach_count} conversation(s) have exceeded the {sla_minutes}-minute response SLA.\n"
                f"Please check your NexusAI dashboard immediately."
            )
        }
        async with httpx.AsyncClient() as client:
            await client.post(webhook_url, json=payload, timeout=5)
    except Exception as e:
        logger.error(f"Slack SLA notification failed: {e}")
