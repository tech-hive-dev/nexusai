import pytest
from unittest.mock import AsyncMock, patch
from app.services.knowledge import _chunk_text, _ingest_website

def test_chunk_text():
    text = "This is a long string that should be chunked into smaller pieces for vector search. " * 10
    # With chunk_size=20 and overlap=0, it should split by roughly every 20 words
    chunks = _chunk_text(text, chunk_size=20, overlap=0)
    assert len(chunks) > 1
    assert all(len(c.split()) <= 20 for c in chunks)

@pytest.mark.asyncio
async def test_ingest_website_crawling():
    url = "https://example.com"
    html_content = "<html><body><h1>Test Page</h1><p>" + "This is a paragraph with a lot of text so the chunk length is above fifty characters safely. " * 3 + "</p><a href='/page1'>Page 1</a></body></html>"
    
    with patch("httpx.AsyncClient.get") as mock_get:
        # Mock response for the main page
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.text = html_content
        mock_get.return_value = mock_resp
        
        # We only want to test 1 level of depth carefully
        chunks = await _ingest_website(url, depth=1)
        
        assert len(chunks) > 0
        # Check if text was extracted
        assert any("Test" in c for c in chunks)
