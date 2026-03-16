"""
Sentiment & Mood Detection Service
────────────────────────────────────
Uses Claude to classify customer emotion and intensity.
Replaces the simple keyword-based _detect_sentiment() in agent.py.
Returns: emotion, intensity (0-1), should_escalate flag.
"""
import anthropic
from dataclasses import dataclass
from loguru import logger

from app.core.config import settings

def _get_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

ESCALATION_EMOTIONS = {"angry", "frustrated", "outraged"}


@dataclass
class SentimentResult:
    emotion: str        # frustrated | urgent | angry | confused | delighted | neutral
    intensity: float    # 0.0 to 1.0
    should_escalate: bool
    raw: str            # raw claude output for debugging


async def analyze_sentiment(message: str, context: str = "") -> SentimentResult:
    """
    Classify the emotional state of a customer message.
    Falls back to keyword heuristic if Claude call fails.
    """
    try:
        prompt = f"""Analyze the emotional tone of this customer message and respond with ONLY a JSON object.

Customer message: "{message}"
{f'Recent context: {context[:300]}' if context else ''}

Respond with exactly this JSON (no markdown, no explanation):
{{
  "emotion": "<one of: frustrated|urgent|angry|confused|delighted|satisfied|neutral>",
  "intensity": <float 0.0-1.0>,
  "should_escalate": <true|false>
}}

Guidelines:
- frustrated: annoyed, things not working as expected
- urgent: time-sensitive, needs immediate help
- angry: hostile, aggressive, threatening
- confused: lost, unclear, needs clarification
- delighted: very happy, complimentary
- satisfied: content, pleased
- neutral: factual, no strong emotion
- should_escalate: true only if angry with intensity > 0.7 OR contains threats/legal language"""

        response = await _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        raw = response.content[0].text.strip()
        data = json.loads(raw)

        emotion = data.get("emotion", "neutral")
        intensity = float(data.get("intensity", 0.5))
        should_escalate = bool(data.get("should_escalate", False))

        # Override: always escalate if angry and high intensity
        if emotion == "angry" and intensity >= 0.7:
            should_escalate = True

        return SentimentResult(
            emotion=emotion,
            intensity=intensity,
            should_escalate=should_escalate,
            raw=raw,
        )

    except Exception as e:
        logger.warning(f"Claude sentiment analysis failed, using heuristic: {e}")
        return _heuristic_sentiment(message)


def _heuristic_sentiment(message: str) -> SentimentResult:
    """Fallback keyword-based sentiment when Claude is unavailable."""
    msg = message.lower()

    angry_words = ["angry", "furious", "outraged", "lawsuit", "sue", "fraud", "scam", "terrible", "horrible"]
    frustrated_words = ["frustrated", "annoyed", "disappointed", "useless", "broken", "doesn't work", "not working"]
    urgent_words = ["urgent", "asap", "immediately", "right now", "emergency", "critical"]
    confused_words = ["confused", "don't understand", "unclear", "what does", "how do"]
    delighted_words = ["amazing", "excellent", "love", "perfect", "wonderful", "thank you", "great job"]

    if any(w in msg for w in angry_words):
        intensity = 0.85
        return SentimentResult(emotion="angry", intensity=intensity, should_escalate=True, raw="heuristic")
    if any(w in msg for w in urgent_words):
        return SentimentResult(emotion="urgent", intensity=0.75, should_escalate=False, raw="heuristic")
    if any(w in msg for w in frustrated_words):
        return SentimentResult(emotion="frustrated", intensity=0.6, should_escalate=False, raw="heuristic")
    if any(w in msg for w in confused_words):
        return SentimentResult(emotion="confused", intensity=0.4, should_escalate=False, raw="heuristic")
    if any(w in msg for w in delighted_words):
        return SentimentResult(emotion="delighted", intensity=0.8, should_escalate=False, raw="heuristic")

    return SentimentResult(emotion="neutral", intensity=0.2, should_escalate=False, raw="heuristic")


def sentiment_to_tone_instruction(result: SentimentResult) -> str:
    """Return a tone instruction string to inject into the agent system prompt."""
    tone_map = {
        "angry":      "TONE: Customer is very angry. Be extremely empathetic, apologize sincerely, avoid excuses. Offer immediate concrete help.",
        "frustrated": "TONE: Customer is frustrated. Acknowledge their frustration first, then provide clear step-by-step help.",
        "urgent":     "TONE: Customer has an urgent need. Respond directly and quickly, prioritize their immediate concern.",
        "confused":   "TONE: Customer is confused. Use simple language, short sentences, numbered steps. Avoid jargon.",
        "delighted":  "TONE: Customer is happy. Match their positive energy, be warm and friendly.",
        "satisfied":  "TONE: Customer is satisfied. Be friendly and efficient.",
        "neutral":    "TONE: Neutral conversation. Be professional and helpful.",
    }
    return tone_map.get(result.emotion, tone_map["neutral"])
