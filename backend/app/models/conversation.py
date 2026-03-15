from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("customers.id"))
    channel: Mapped[str] = mapped_column(String(50), nullable=False, default="website")
    status: Mapped[Optional[str]] = mapped_column(String(50), default="open")
    language: Mapped[Optional[str]] = mapped_column(String(10), default="en")
    sentiment: Mapped[Optional[str]] = mapped_column(String(20))
    intent: Mapped[Optional[str]] = mapped_column(String(100))
    human_agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    is_human_takeover: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    session_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    first_response_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sla_breached: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    csat_score: Mapped[Optional[int]] = mapped_column(Integer)
    csat_requested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    dominant_emotion: Mapped[Optional[str]] = mapped_column(String(50))
    annotation: Mapped[Optional[str]] = mapped_column(String(50))


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"))
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String(50), default="text")
    media_url: Mapped[Optional[str]] = mapped_column(Text)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, default=dict)
    is_human_override: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    sentiment: Mapped[Optional[str]] = mapped_column(String(50))
    sentiment_score: Mapped[Optional[float]] = mapped_column()
    flagged_pii: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
