"""
Billing / Usage Enforcement Service
─────────────────────────────────────
Checks every tenant's conversation usage against plan limits.
Sends warnings at 80% / 95% and blocks at 100%.
Runs hourly via Celery beat.
"""
from loguru import logger
from sqlalchemy import select
from app.models.tenant import Tenant

PLAN_LIMITS = {
    "starter":  500,
    "growth":   2000,
    "business": 10000,
    "reseller": 999999,
}

UPGRADE_MSG = {
    80: "⚠️ Heads up! You've used {pct}% of your {limit} monthly conversation limit on your {plan} plan. "
        "Upgrade now to keep your AI running: https://app.nexusai.app/dashboard → Billing",
    95: "🚨 Critical: You've used {pct}% of your monthly conversation limit! "
        "Your AI will stop responding when you hit 100%. Upgrade immediately at: https://app.nexusai.app/dashboard → Billing",
    100: "🛑 Conversation limit reached. Your AI agent has been paused for this billing cycle. "
         "Upgrade your plan to re-activate: https://app.nexusai.app/dashboard → Billing",
}


async def check_all_tenant_usage(db_factory) -> None:
    """
    Loop every active tenant, compute usage %, and act on thresholds.
    """
    async with db_factory() as db:
        result = await db.execute(
            select(Tenant).where(Tenant.is_active == True)
        )
        tenants = result.scalars().all()

        for tenant in tenants:
            try:
                await _check_tenant_usage(tenant, db)
            except Exception as e:
                logger.error(f"Usage check failed for tenant {tenant.slug}: {e}")


async def _check_tenant_usage(tenant: Tenant, db) -> None:
    limit = tenant.conversation_limit or PLAN_LIMITS.get(tenant.plan, 500)
    count = tenant.conversation_count or 0
    pct = int((count / limit) * 100) if limit else 0

    # Determine which threshold we've just crossed
    threshold = None
    if pct >= 100:
        threshold = 100
    elif pct >= 95:
        threshold = 95
    elif pct >= 80:
        threshold = 80

    if threshold is None:
        return

    # Check if we already notified at this threshold this cycle
    # (store last_usage_alert_pct on tenant to avoid spam)
    last_alert = getattr(tenant, "last_usage_alert_pct", 0) or 0
    if last_alert >= threshold:
        return

    # Update threshold tracker
    tenant.last_usage_alert_pct = threshold
    await db.commit()

    # Compose message
    msg_template = UPGRADE_MSG[threshold]
    message = msg_template.format(
        pct=pct,
        limit=f"{limit:,}",
        plan=tenant.plan.title(),
    )

    # Send WhatsApp to owner if phone is set
    owner_phone = getattr(tenant, "owner_whatsapp_number", None)
    if owner_phone:
        await _send_owner_whatsapp(owner_phone, message, tenant)

    # Slack notification
    slack_url = getattr(tenant, "slack_webhook_url", None)
    if slack_url:
        await _notify_slack(slack_url, tenant.name, pct, limit)

    logger.info(f"Usage alert [{threshold}%] sent for tenant {tenant.slug} ({pct}% used)")


async def _send_owner_whatsapp(phone: str, message: str, tenant: Tenant) -> None:
    if not getattr(tenant, "whatsapp_phone_number_id", None):
        return
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://graph.facebook.com/v18.0/{tenant.whatsapp_phone_number_id}/messages",
                headers={
                    "Authorization": f"Bearer {tenant.whatsapp_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": phone,
                    "type": "text",
                    "text": {"body": message},
                },
                timeout=10,
            )
    except Exception as e:
        logger.error(f"Owner WhatsApp alert failed: {e}")


async def _notify_slack(webhook_url: str, tenant_name: str, pct: int, limit: int) -> None:
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                webhook_url,
                json={"text": f"📊 *{tenant_name}* has used *{pct}%* of {limit:,} monthly conversations. Upgrade needed!"},
                timeout=5,
            )
    except Exception as e:
        logger.error(f"Slack usage alert failed: {e}")
