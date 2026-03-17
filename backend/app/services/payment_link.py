"""
Payment Link Service
─────────────────────
Creates Stripe payment links for in-chat payment collection.
"""
from loguru import logger


async def create_payment_link(
    amount: float,
    description: str,
    currency: str = "gbp",
    customer_email: str = "",
    tenant_id: str = "",
) -> str:
    """Create a Stripe payment link and return the URL."""
    try:
        import stripe
        from app.core.config import settings

        stripe.api_key = settings.STRIPE_SECRET_KEY
        if not stripe.api_key:
            raise ValueError("Stripe not configured")

        link = stripe.PaymentLink.create(
            line_items=[{
                "price_data": {
                    "currency": currency.lower(),
                    "product_data": {"name": description},
                    "unit_amount": int(amount * 100),
                },
                "quantity": 1,
            }],
            metadata={
                "tenant_id": tenant_id,
                "customer_email": customer_email,
            },
        )
        return link.url
    except Exception as e:
        logger.error(f"Payment link creation failed: {e}")
        raise
