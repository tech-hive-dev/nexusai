"""
Knowledge Gap Detection Service
────────────────────────────────
Analyzes conversations to identify questions the agent couldn't answer.
Clusters common gaps to suggest new knowledge base content.
"""
from loguru import logger
from sqlalchemy import text
from datetime import datetime, timedelta
import json

async def run_gap_detection(AsyncSessionLocal):
    """
    Scans recent conversations for 'unanswered' patterns.
    Clusters them via Claude to surface missing knowledge.
    """
    async with AsyncSessionLocal() as db:
        # 1. Fetch recent user messages where the assistant likely failed
        # Heuristic: Assistant response includes "I apologize", "don't know", "rephrase", or "contact support"
        # and there was no knowledge context (harder to check from SQL without extra columns, 
        # so we search for the default 'I apologize' message from agent.py)
        
        failure_patterns = [
            "%I apologize, I'm experiencing a technical issue%",
            "%Could you please rephrase that%",
            "%I apologize, I'm not sure about that%",
            "%contact our support team for more details%"
        ]
        
        unanswered_query = text("""
            SELECT m1.content as question, m1.tenant_id, t.name as business_name
            FROM messages m1
            JOIN messages m2 ON m1.conversation_id = m2.conversation_id 
                 AND m2.created_at > m1.created_at
            JOIN tenants t ON m1.tenant_id = t.id
            WHERE m1.role = 'user'
            AND m2.role = 'assistant'
            AND m1.created_at > NOW() - INTERVAL '7 days'
            AND (""" + " OR ".join([f"m2.content LIKE :p{i}" for i in range(len(failure_patterns))]) + """)
            LIMIT 500
        """)
        
        params = {f"p{i}": pattern for i, pattern in enumerate(failure_patterns)}
        result = await db.execute(unanswered_query, params)
        rows = result.mappings().all()
        
        if not rows:
            logger.info("No knowledge gaps detected this week.")
            return

        # 2. Group by tenant
        tenant_gaps = {}
        for row in rows:
            t_id = str(row["tenant_id"])
            if t_id not in tenant_gaps:
                tenant_gaps[t_id] = {"name": row["business_name"], "questions": []}
            if row["question"] not in tenant_gaps[t_id]["questions"]:
                tenant_gaps[t_id]["questions"].append(row["question"])

        # 3. Analyze each tenant's gaps via Claude
        for tenant_id, data in tenant_gaps.items():
            if len(data["questions"]) < 3: # Need at least 3 to cluster
                continue
                
            try:
                clusters = await _cluster_gaps_via_claude(data["questions"], data["name"])
                
                # 4. Save results (assuming we have a place for 'suggestions' or just logging)
                # For now, we'll log them. Future: save to a 'knowledge_suggestions' table.
                logger.info(f"Knowledge gaps for {data['name']}: {clusters}")
                
            except Exception as e:
                logger.error(f"Failed analysis for tenant {tenant_id}: {e}")

async def _cluster_gaps_via_claude(questions: list[str], business_name: str) -> list[dict]:
    """Uses Claude to cluster questions into actionable 'gap' topics."""
    from app.services.agent import client
    
    questions_text = "\n".join([f"- {q}" for q in questions[:100]])
    prompt = f"""
    Analyze these unanswered customer questions for the business "{business_name}".
    Group them into 3-5 distinct "Knowledge Gaps" that the business should address.
    
    Questions:
    {questions_text}
    
    Return a JSON array of objects:
    [
      {{"topic": "Shipping to Europe", "description": "Multiple customers asked about EU shipping costs.", "impact": "High"}},
      ...
    ]
    Return ONLY JSON.
    """
    
    try:
        response = await client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        # Handle potential text wrapper around JSON
        raw_content = response.content[0].text
        start = raw_content.find("[")
        end = raw_content.rfind("]") + 1
        if start != -1 and end != -1:
            return json.loads(raw_content[start:end])
        return []
    except Exception:
        return []
