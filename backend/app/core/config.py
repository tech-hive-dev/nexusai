from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "NexusAI"
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Database
    DATABASE_URL: str = "postgresql://nexusai:nexusai_secret@localhost:5432/nexusai"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Auth
    JWT_SECRET: str = "change_this_secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24 * 7  # 7 days

    # AI
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"
    EMBEDDING_MODEL: str = "text-embedding-3-small"  # via OpenAI
    OPENAI_API_KEY: str = ""  # for embeddings + Whisper

    # Email
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM: str = "hello@nexusai.app"
    EMAIL_FROM_NAME: str = "NexusAI"

    # Payments
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_STARTER_PRICE_ID: str = ""
    STRIPE_GROWTH_PRICE_ID: str = ""
    STRIPE_BUSINESS_PRICE_ID: str = ""

    # WhatsApp
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "nexusai_verify"
    WHATSAPP_PHONE_ID: str = ""

    # Facebook
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""

    # Cal.com
    CAL_API_KEY: str = ""

    # Shopify / WooCommerce
    SHOPIFY_WEBHOOK_SECRET: str = ""

    # ElevenLabs (voice replies)
    ELEVENLABS_API_KEY: str = ""

    # Slack notifications
    SLACK_WEBHOOK_URL: str = ""

    # Cloudflare R2 / AWS S3
    R2_BUCKET: str = ""
    R2_ENDPOINT: str = ""
    R2_ACCESS_KEY: str = ""
    R2_SECRET_KEY: str = ""

    # Sentry
    SENTRY_DSN: str = ""
    
    # PostHog
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://app.posthog.com"

    # Plan limits
    PLAN_STARTER_CONVOS: int = 500
    PLAN_GROWTH_CONVOS: int = 2000
    PLAN_BUSINESS_CONVOS: int = 10000

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
