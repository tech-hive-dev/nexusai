"""
Industry Templates Service
───────────────────────────
Loads pre-built knowledge bases and conversation flows for 6 SME verticals
and applies them to a tenant on onboarding.
"""
import json
import os
from pathlib import Path
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

TEMPLATES_DIR = Path(__file__).parent.parent / "data" / "templates"

INDUSTRIES = {
    "restaurant": "Restaurant / Food & Beverage",
    "salon": "Salon & Beauty",
    "real_estate": "Real Estate",
    "clinic": "Clinic & Healthcare",
    "ecommerce": "E-commerce",
    "trades": "Trades (Plumber / Electrician / Builder)",
}


def list_templates() -> list[dict]:
    """Return metadata for all available industry templates."""
    result = []
    for key, label in INDUSTRIES.items():
        template_dir = TEMPLATES_DIR / key
        result.append({
            "id": key,
            "name": label,
            "available": template_dir.exists(),
        })
    return result


def load_template(industry: str) -> dict:
    """Load the full template for an industry."""
    template_dir = TEMPLATES_DIR / industry
    if not template_dir.exists():
        raise ValueError(f"Template '{industry}' not found")

    kb_path = template_dir / "knowledge_base.json"
    flow_path = template_dir / "conversation_flow.json"
    prompt_path = template_dir / "system_prompt.txt"

    knowledge_base = json.loads(kb_path.read_text()) if kb_path.exists() else []
    conversation_flow = json.loads(flow_path.read_text()) if flow_path.exists() else {}
    system_prompt = prompt_path.read_text() if prompt_path.exists() else ""

    return {
        "knowledge_base": knowledge_base,
        "conversation_flow": conversation_flow,
        "system_prompt": system_prompt,
    }


async def apply_industry_template(tenant_id: str, industry: str, db: AsyncSession) -> dict:
    """
    Seed the knowledge base for a tenant from an industry template.
    Returns count of chunks ingested.
    """
    template = load_template(industry)
    knowledge_base = template["knowledge_base"]

    if not knowledge_base:
        return {"ingested": 0, "industry": industry}

    from app.models.knowledge import KnowledgeSource, KnowledgeChunk
    from app.services.knowledge import embed_text
    import uuid as _uuid

    # Create a single source record for the template
    source = KnowledgeSource(
        tenant_id=_uuid.UUID(tenant_id),
        source_type="template",
        title=f"{INDUSTRIES.get(industry, industry)} Template",
        status="ready",
    )
    db.add(source)
    await db.flush()

    ingested = 0
    for item in knowledge_base:
        content = f"Q: {item.get('question', '')}\nA: {item.get('answer', '')}"
        try:
            embedding = await embed_text(content)
        except Exception:
            embedding = None

        chunk = KnowledgeChunk(
            source_id=source.id,
            tenant_id=_uuid.UUID(tenant_id),
            content=content,
            embedding=embedding,
            chunk_index=ingested,
        )
        db.add(chunk)
        ingested += 1

    # Update tenant industry + agent persona
    from sqlalchemy import text
    await db.execute(
        text("""
            UPDATE tenants
            SET industry = :industry
            WHERE id = :tid
        """),
        {"industry": INDUSTRIES.get(industry, industry), "tid": tenant_id},
    )

    await db.commit()
    logger.info(f"Applied {industry} template to tenant {tenant_id}: {ingested} FAQs ingested")
    return {"ingested": ingested, "industry": industry}
