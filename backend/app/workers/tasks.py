"""
NexusAI Celery Tasks
All background/scheduled jobs are registered here.
"""
from app.workers.main import celery_app
from loguru import logger


# ─── CART RECOVERY ───────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.send_cart_recovery_message", bind=True, max_retries=3)
def send_cart_recovery_message(self, recovery_id: str, step: int):
    """Send one step of a 3-message cart recovery sequence."""
    try:
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.services.cart_recovery import execute_recovery_step
        asyncio.run(execute_recovery_step(recovery_id, step, AsyncSessionLocal))
    except Exception as exc:
        logger.error(f"Cart recovery task failed: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


# ─── FOLLOW-UP SEQUENCES ─────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.send_followup_message", bind=True, max_retries=3)
def send_followup_message(self, conversation_id: str, step: int):
    """Send a follow-up message (Day 1/3/7 sequence)."""
    try:
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.services.followup import execute_followup_step
        asyncio.run(execute_followup_step(conversation_id, step, AsyncSessionLocal))
    except Exception as exc:
        logger.error(f"Follow-up task failed: {exc}")
        raise self.retry(exc=exc, countdown=300)


# ─── WEEKLY REPORTS ──────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.send_weekly_reports")
def send_weekly_reports():
    """Generate and send weekly business summary to all active tenant owners."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.reports import send_all_weekly_reports
    asyncio.run(send_all_weekly_reports(AsyncSessionLocal))
    logger.info("Weekly reports sent")


# ─── PROACTIVE OUTREACH ───────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.proactive_reengagement")
def proactive_reengagement():
    """Re-engage customers silent for 30+ days."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.outbound import run_reengagement_campaign
    asyncio.run(run_reengagement_campaign(AsyncSessionLocal))
    logger.info("Proactive re-engagement run complete")


@celery_app.task(name="app.workers.tasks.send_appointment_reminders")
def send_appointment_reminders():
    """Send 24h appointment reminders to customers."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.outbound import send_appointment_reminders as _send
    asyncio.run(_send(AsyncSessionLocal))


# ─── CSAT & REVIEWS ──────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.send_csat_request", bind=True, max_retries=2)
def send_csat_request(self, conversation_id: str):
    """Send CSAT rating request after conversation resolved."""
    try:
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.services.csat import send_csat_to_customer
        asyncio.run(send_csat_to_customer(conversation_id, AsyncSessionLocal))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)


@celery_app.task(name="app.workers.tasks.send_google_review_request", bind=True, max_retries=2)
def send_google_review_request(self, conversation_id: str):
    """Send Google review link 2 hours after high CSAT."""
    try:
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.services.csat import send_review_request
        asyncio.run(send_review_request(conversation_id, AsyncSessionLocal))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


# ─── SLA MONITORING ──────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.check_sla_breaches")
def check_sla_breaches():
    """Check for SLA breaches every minute and notify agents."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.sla import check_and_notify_breaches
    asyncio.run(check_and_notify_breaches(AsyncSessionLocal))


# ─── USAGE THRESHOLDS ────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.check_usage_thresholds")
def check_usage_thresholds():
    """Check if tenants are approaching conversation limits (80%/95%/100%)."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.billing import check_all_tenant_usage
    asyncio.run(check_all_tenant_usage(AsyncSessionLocal))


# ─── KNOWLEDGE BASE ──────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.process_knowledge_source", bind=True, max_retries=2)
def process_knowledge_source(self, source_id: str, tenant_id: str):
    """Process a knowledge source (crawl/parse/embed) in background."""
    try:
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.services.knowledge import process_source
        asyncio.run(process_source(source_id, tenant_id, AsyncSessionLocal))
        logger.info(f"Knowledge source {source_id} processed")
    except Exception as exc:
        logger.error(f"Knowledge source processing failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.workers.tasks.detect_knowledge_gaps")
def detect_knowledge_gaps():
    """Analyze unanswered questions and cluster knowledge gaps."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.gap_detection import run_gap_detection
    asyncio.run(run_gap_detection(AsyncSessionLocal))
    logger.info("Knowledge gap detection complete")


# ─── LTV & ANALYTICS ─────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.update_ltv_scores")
def update_ltv_scores():
    """Nightly LTV and churn risk score update for all customers."""
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.services.ltv import update_all_customer_scores
    asyncio.run(update_all_customer_scores(AsyncSessionLocal))
    logger.info("LTV scoring complete")


@celery_app.task(name="app.workers.tasks.rollup_analytics")
def rollup_analytics():
    """Daily rollup of analytics_daily table."""
    import asyncio
    from datetime import date
    from app.core.database import AsyncSessionLocal
    from app.services.analytics_rollup import rollup_for_date
    asyncio.run(rollup_for_date(date.today(), AsyncSessionLocal))
    logger.info("Analytics rollup complete")


# ─── MEMORY ──────────────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.summarize_conversation", bind=True)
def summarize_conversation(self, conversation_id: str):
    """Generate customer memory summary after conversation resolves."""
    try:
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.services.memory import summarize_and_store
        asyncio.run(summarize_and_store(conversation_id, AsyncSessionLocal))
    except Exception as exc:
        logger.warning(f"Conversation summary failed (non-critical): {exc}")


# ─── BROADCASTS ──────────────────────────────────────────────────────────────

@celery_app.task(name="app.workers.tasks.send_broadcast", bind=True, max_retries=2)
def send_broadcast(self, broadcast_id: str):
    """Dispatch a broadcast campaign to all matching recipients."""
    try:
        import asyncio
        from app.core.database import AsyncSessionLocal
        from app.services.broadcast_sender import execute_broadcast
        asyncio.run(execute_broadcast(broadcast_id, AsyncSessionLocal))
        logger.info(f"Broadcast {broadcast_id} complete")
    except Exception as exc:
        logger.error(f"Broadcast {broadcast_id} failed: {exc}")
        raise self.retry(exc=exc, countdown=120)
