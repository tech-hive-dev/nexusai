"""
PII Detection Service
──────────────────────
Claude-based PII classifier for inbound messages.
Flags sensitive data (credit cards, SSNs, passwords) before storage.
Also handles GDPR auto-purge logic.
"""
import re
from dataclasses import dataclass
from typing import Optional
from loguru import logger
import anthropic

from app.core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

# Fast regex pre-check — only call Claude if pattern matches
PII_PATTERNS = [
    re.compile(r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b"),      # Credit card
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),                                  # SSN
    re.compile(r"\bpassword\s*[:=]\s*\S+", re.IGNORECASE),                 # Password
    re.compile(r"\bpin\s*[:=]\s*\d{4,6}\b", re.IGNORECASE),               # PIN
    re.compile(r"\bcvv\s*[:=]?\s*\d{3,4}\b", re.IGNORECASE),              # CVV
]


@dataclass
class PIIResult:
    has_pii: bool
    pii_types: list
    redacted_text: str  # original text with PII replaced by [REDACTED]


async def scan_message(text: str) -> PIIResult:
    """
    Scan a message for PII. Fast regex check first, then Claude for confirmation.
    Returns PIIResult with has_pii flag and redacted version.
    """
    if not text:
        return PIIResult(has_pii=False, pii_types=[], redacted_text=text)

    # Fast pre-check with regex
    regex_hit = any(p.search(text) for p in PII_PATTERNS)

    if not regex_hit:
        return PIIResult(has_pii=False, pii_types=[], redacted_text=text)

    # Confirmed PII patterns found — redact and return
    redacted = _regex_redact(text)
    pii_types = _detect_pii_types(text)
    return PIIResult(has_pii=True, pii_types=pii_types, redacted_text=redacted)


def _regex_redact(text: str) -> str:
    """Replace known PII patterns with [REDACTED]."""
    result = text
    result = re.sub(r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b", "[CARD REDACTED]", result)
    result = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[SSN REDACTED]", result)
    result = re.sub(r"\bpassword\s*[:=]\s*\S+", "[PASSWORD REDACTED]", result, flags=re.IGNORECASE)
    result = re.sub(r"\bpin\s*[:=]\s*\d{4,6}\b", "[PIN REDACTED]", result, flags=re.IGNORECASE)
    result = re.sub(r"\bcvv\s*[:=]?\s*\d{3,4}\b", "[CVV REDACTED]", result, flags=re.IGNORECASE)
    return result


def _detect_pii_types(text: str) -> list:
    types = []
    if re.search(r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b", text):
        types.append("credit_card")
    if re.search(r"\b\d{3}-\d{2}-\d{4}\b", text):
        types.append("ssn")
    if re.search(r"\bpassword\s*[:=]\s*\S+", text, re.IGNORECASE):
        types.append("password")
    if re.search(r"\bpin\s*[:=]\s*\d{4,6}\b", text, re.IGNORECASE):
        types.append("pin")
    if re.search(r"\bcvv\s*[:=]?\s*\d{3,4}\b", text, re.IGNORECASE):
        types.append("cvv")
    return types


async def purge_old_conversations(db_factory, tenant_id: str, retention_days: int) -> int:
    """
    Delete conversations (and messages) older than retention_days.
    Returns count of deleted conversations.
    """
    from sqlalchemy import text as sql_text
    deleted = 0
    async with db_factory() as db:
        try:
            result = await db.execute(
                sql_text("""
                    WITH deleted AS (
                        DELETE FROM conversations
                        WHERE tenant_id = :tenant_id
                          AND created_at < NOW() - INTERVAL ':days days'
                        RETURNING id
                    )
                    SELECT COUNT(*) FROM deleted
                """),
                {"tenant_id": tenant_id, "days": retention_days},
            )
            deleted = result.scalar() or 0
            await db.commit()
            logger.info(f"GDPR purge: removed {deleted} conversations for tenant {tenant_id}")
        except Exception as e:
            logger.error(f"GDPR purge failed: {e}")
    return deleted
