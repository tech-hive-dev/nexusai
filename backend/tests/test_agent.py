import pytest
from unittest.mock import AsyncMock, patch
from app.services.agent import run_agent, AGENT_TOOLS
from app.models.tenant import Tenant
from app.models.customer import Customer
import uuid

@pytest.mark.asyncio
async def test_run_agent_basic_response(db_session):
    # Setup mock tenant/customer
    tenant = Tenant(id=uuid.uuid4(), name="Test Tenant", slug="test", anthropic_api_key="mock")
    customer = Customer(id=uuid.uuid4(), name="User", external_id="ext", channel="web")
    
    # Mock Anthropic Client directly on the module instance
    with patch("app.services.agent.client.messages.create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value.content = [
            AsyncMock(type="text", text="Hello! How can I help?")
        ]
        
        # Mock language and sentiment
        with patch("app.services.language.detect_language", AsyncMock(return_value="en")), \
             patch("app.services.sentiment.analyze_sentiment", AsyncMock(return_value=AsyncMock(emotion="neutral", intensity=0.5, should_escalate=False))):
            
            result = await run_agent(
                message="Hi",
                conversation_id=str(uuid.uuid4()),
                tenant=tenant,
                customer=customer,
                db=db_session
            )
            
            assert "Hello" in result["response"]
            assert result["language"] == "en"
            assert result["sentiment"] == "neutral"

@pytest.mark.asyncio
async def test_agent_tool_calling_logic(db_session):
    # Verify tools are present
    assert any(t["name"] == "capture_lead" for t in AGENT_TOOLS)
    assert any(t["name"] == "book_appointment" for t in AGENT_TOOLS)
