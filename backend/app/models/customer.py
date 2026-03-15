from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, JSON, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    external_id: Mapped[Optional[str]] = mapped_column(String(255))
    channel: Mapped[Optional[str]] = mapped_column(String(50))
    name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    language: Mapped[Optional[str]] = mapped_column(String(10), default="en")
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    total_conversations: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    birthday: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    conversation_summary: Mapped[Optional[str]] = mapped_column(Text)
    last_order_summary: Mapped[Optional[str]] = mapped_column(Text)
