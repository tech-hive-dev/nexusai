from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "nexusai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "weekly-reports": {
            "task": "app.workers.tasks.send_weekly_reports",
            "schedule": crontab(hour=9, minute=0, day_of_week=1),
        },
        "proactive-reengagement": {
            "task": "app.workers.tasks.proactive_reengagement",
            "schedule": crontab(hour=10, minute=0),
        },
        "appointment-reminders": {
            "task": "app.workers.tasks.send_appointment_reminders",
            "schedule": crontab(minute=0),
        },
        "sla-breach-check": {
            "task": "app.workers.tasks.check_sla_breaches",
            "schedule": 60.0,
        },
        "usage-threshold-check": {
            "task": "app.workers.tasks.check_usage_thresholds",
            "schedule": crontab(minute=0),
        },
        "nightly-ltv-scoring": {
            "task": "app.workers.tasks.update_ltv_scores",
            "schedule": crontab(hour=2, minute=0),
        },
        "weekly-gap-detection": {
            "task": "app.workers.tasks.detect_knowledge_gaps",
            "schedule": crontab(hour=3, minute=0, day_of_week=0),
        },
        "daily-analytics-rollup": {
            "task": "app.workers.tasks.rollup_analytics",
            "schedule": crontab(hour=1, minute=0),
        },
    },
)

if __name__ == "__main__":
    celery_app.start()
