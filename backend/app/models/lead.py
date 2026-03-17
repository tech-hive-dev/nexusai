from uuid import uuid4
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id       = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), nullable=True)
    customer_id     = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)

    # Qualification data
    score           = Column(Integer, default=0)          # 0-100
    status          = Column(String(20), default="cold")  # hot / warm / cold
    budget          = Column(String(255))
    timeline        = Column(String(255))
    decision_maker  = Column(Boolean, default=False)
    need_summary    = Column(Text)
    recommended_action = Column(Text)

    # Contact info (captured during conversation)
    contact_name    = Column(String(255))
    contact_email   = Column(String(255))
    contact_phone   = Column(String(100))

    # Lifecycle
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    followed_up_at  = Column(DateTime(timezone=True))
    converted       = Column(Boolean, default=False)
    converted_at    = Column(DateTime(timezone=True))
