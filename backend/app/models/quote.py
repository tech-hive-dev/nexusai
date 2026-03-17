from uuid import uuid4
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base


class Quote(Base):
    __tablename__ = "quotes"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id       = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    lead_id         = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    customer_id     = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    conversation_id = Column(UUID(as_uuid=True), nullable=True)

    # Quote content
    line_items      = Column(JSONB, default=list)   # [{description, price}]
    subtotal        = Column(Float, default=0.0)
    currency        = Column(String(10), default="GBP")
    notes           = Column(Text)
    chat_summary    = Column(Text)   # short version shown in chat

    # Lifecycle
    status          = Column(String(20), default="draft")  # draft/sent/accepted/rejected
    valid_until     = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    sent_at         = Column(DateTime(timezone=True))
    accepted_at     = Column(DateTime(timezone=True))

    # Contact
    contact_name    = Column(String(255))
    contact_email   = Column(String(255))
