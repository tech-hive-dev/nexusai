from uuid import uuid4
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id        = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name             = Column(String(255), nullable=False)
    message_template = Column(Text, nullable=False)  # Supports {name}, {company}, {offer}
    campaign_type    = Column(String(50), default="broadcast")  # broadcast | followup_sequence
    status           = Column(String(20), default="draft")  # draft|scheduled|sending|complete
    scheduled_at     = Column(DateTime(timezone=True))
    sent_count       = Column(String(10), default="0")
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    completed_at     = Column(DateTime(timezone=True))


class CampaignContact(Base):
    __tablename__ = "campaign_contacts"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    phone       = Column(String(100), nullable=False)
    name        = Column(String(255))
    company     = Column(String(255))
    sent_at     = Column(DateTime(timezone=True))
    delivered   = Column(Boolean, default=False)
    replied     = Column(Boolean, default=False)
