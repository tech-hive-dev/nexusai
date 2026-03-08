async def detect_language(text: str) -> str:
    """Simple language detection based on character patterns"""
    if not text:
        return "en"
    # Arabic
    if any('\u0600' <= c <= '\u06FF' for c in text):
        return "ar"
    # Urdu (similar range but different usage)
    # Spanish signals
    spanish_words = ["hola", "gracias", "cómo", "qué", "está", "por favor", "ayuda"]
    if any(w in text.lower() for w in spanish_words):
        return "es"
    # French signals
    french_words = ["bonjour", "merci", "comment", "vous", "s'il vous", "aide"]
    if any(w in text.lower() for w in french_words):
        return "fr"
    return "en"
