from app.core.config import settings
from loguru import logger

async def send_escalation_alert(to_email: str, tenant_name: str, conversation_id: str, reason: str):
    if not settings.SENDGRID_API_KEY:
        logger.warning("SendGrid not configured, skipping email")
        return
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=settings.EMAIL_FROM,
            to_emails=to_email,
            subject=f"[{tenant_name}] Customer needs human assistance",
            html_content=f"""
                <h2>Human Escalation Required</h2>
                <p><strong>Business:</strong> {tenant_name}</p>
                <p><strong>Reason:</strong> {reason}</p>
                <p><strong>Conversation ID:</strong> {conversation_id}</p>
                <p>Please log into your NexusAI dashboard to handle this conversation.</p>
            """
        )
        sg.send(message)
    except Exception as e:
        logger.error(f"Email send error: {e}")

async def send_welcome_email(to_email: str, business_name: str, agent_name: str):
    if not settings.SENDGRID_API_KEY:
        return
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=settings.EMAIL_FROM,
            to_emails=to_email,
            subject=f"Welcome to NexusAI — {agent_name} is ready!",
            html_content=f"""
                <h1>Welcome to NexusAI, {business_name}!</h1>
                <p>Your AI agent <strong>{agent_name}</strong> has been created.</p>
                <p>Complete your onboarding to go live in under 30 minutes.</p>
                <a href="{settings.FRONTEND_URL}/onboarding" style="background:#4FFFB0;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                    Complete Setup →
                </a>
            """
        )
        sg.send(message)
    except Exception as e:
        logger.error(f"Welcome email error: {e}")
