"""
Brand Voice Guardrails Service
───────────────────────────────
Post-response filter that enforces tenant-specific brand rules:
- Blocked topics (never discuss X)
- Vocabulary overrides (replace word A with word B)
- hide_ai_identity (never say "AI" or "bot")
If a violation is detected, the response is regenerated with
the constraint injected into the prompt.
"""
import json
import re
from loguru import logger
import anthropic

from app.core.config import settings
from app.models.tenant import Tenant

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def check_guardrails(response: str, tenant: Tenant, system_prompt: str = "") -> str:
    """
    Check response against tenant guardrails.
    Returns the (possibly regenerated) response.
    """
    violations = []

    # 1. Blocked topics
    blocked = getattr(tenant, "blocked_topics", None) or []
    if isinstance(blocked, str):
        try:
            blocked = json.loads(blocked)
        except Exception:
            blocked = []

    response_lower = response.lower()
    for topic in blocked:
        if isinstance(topic, str) and topic.lower() in response_lower:
            violations.append(f"mentions blocked topic: '{topic}'")

    # 2. Hide AI identity
    if getattr(tenant, "hide_ai_identity", False):
        ai_phrases = ["i am an ai", "i'm an ai", "as an ai", "i am a bot", "i'm a bot",
                      "as a bot", "artificial intelligence", "language model", "chatbot"]
        for phrase in ai_phrases:
            if phrase in response_lower:
                violations.append("reveals AI identity")
                break

    # 3. Apply vocabulary overrides (no regeneration needed — just replace)
    vocab = getattr(tenant, "vocabulary_overrides", None) or {}
    if isinstance(vocab, str):
        try:
            vocab = json.loads(vocab)
        except Exception:
            vocab = {}

    if isinstance(vocab, dict):
        for find_word, replace_word in vocab.items():
            if find_word and replace_word:
                response = re.sub(
                    rf"\b{re.escape(find_word)}\b",
                    replace_word,
                    response,
                    flags=re.IGNORECASE,
                )

    # 4. If violations found, regenerate with constraints
    if violations and system_prompt:
        constraint_text = "\n\nCRITICAL CONSTRAINTS FOR THIS RESPONSE:\n"
        if blocked:
            constraint_text += f"- NEVER mention or discuss: {', '.join(str(t) for t in blocked)}\n"
        if getattr(tenant, "hide_ai_identity", False):
            constraint_text += "- NEVER refer to yourself as an AI, bot, or language model. You are a helpful assistant.\n"

        try:
            regen = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=800,
                system=system_prompt + constraint_text,
                messages=[{"role": "user", "content": "[Please provide your response following all constraints above]"}],
            )
            if regen.content:
                regenerated = regen.content[0].text
                # Apply vocab overrides to regenerated response too
                if isinstance(vocab, dict):
                    for find_word, replace_word in vocab.items():
                        if find_word and replace_word:
                            regenerated = re.sub(
                                rf"\b{re.escape(find_word)}\b",
                                replace_word,
                                regenerated,
                                flags=re.IGNORECASE,
                            )
                logger.info(f"Guardrails: regenerated response due to violations: {violations}")
                return regenerated
        except Exception as e:
            logger.error(f"Guardrails regeneration failed: {e}")

    return response
