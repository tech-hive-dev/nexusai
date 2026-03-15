from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, JSON, Boolean, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    timezone: Mapped[Optional[str]] = mapped_column(String(100), default="UTC")
    language_default: Mapped[Optional[str]] = mapped_column(String(10), default="en")
    language_fallback: Mapped[Optional[str]] = mapped_column(String(10), default="en")
    agent_name: Mapped[Optional[str]] = mapped_column(String(100), default="Aria")
    agent_persona: Mapped[Optional[str]] = mapped_column(Text, default="Friendly, professional, helpful")
    brand_color: Mapped[Optional[str]] = mapped_column(String(7), default="#4FFFB0")
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    business_hours: Mapped[Optional[dict]] = mapped_column(JSON)
    escalation_email: Mapped[Optional[str]] = mapped_column(String(255))
    escalation_after_failures: Mapped[Optional[int]] = mapped_column(Integer, default=3)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255))
    plan: Mapped[Optional[str]] = mapped_column(String(50), default="starter")
    plan_status: Mapped[Optional[str]] = mapped_column(String(50), default="trial")
    conversation_count: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    conversation_limit: Mapped[Optional[int]] = mapped_column(Integer, default=500)
    is_active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    onboarding_completed: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    onboarding_step: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Extended columns
    owner_whatsapp_number: Mapped[Optional[str]] = mapped_column(String(50))
    weekly_report_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    sla_minutes: Mapped[Optional[int]] = mapped_column(Integer, default=5)
    google_review_url: Mapped[Optional[str]] = mapped_column(Text)
    slack_webhook_url: Mapped[Optional[str]] = mapped_column(Text)
    pii_detection_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    hide_ai_identity: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    blocked_topics: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    vocabulary_overrides: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    competitor_playbook: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    voice_replies_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    elevenlabs_voice_id: Mapped[Optional[str]] = mapped_column(String(100))
    subdomain: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    shopify_access_token: Mapped[Optional[str]] = mapped_column(Text)
    shopify_store_domain: Mapped[Optional[str]] = mapped_column(String(255))
    woocommerce_url: Mapped[Optional[str]] = mapped_column(Text)
    woocommerce_key: Mapped[Optional[str]] = mapped_column(Text)
    woocommerce_secret: Mapped[Optional[str]] = mapped_column(Text)
