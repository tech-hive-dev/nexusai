from __future__ import annotations
import uuid
from typing import Optional
from sqlalchemy import String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), default="Tenant")
    agent_name: Mapped[Optional[str]] = mapped_column(String(255), default="NexusAI Agent")
    slug: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    agent_persona: Mapped[Optional[str]] = mapped_column(String(500), default="Friendly, professional, helpful")
    anthropic_api_key: Mapped[Optional[str]] = mapped_column(String(255))
    openai_api_key: Mapped[Optional[str]] = mapped_column(String(255))
    logo_url: Mapped[Optional[str]] = mapped_column(String(255))
    business_hours: Mapped[Optional[dict]] = mapped_column(JSON)
    escalation_email: Mapped[Optional[str]] = mapped_column(String(255))
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255))
