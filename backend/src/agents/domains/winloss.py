import logging
import json
from src.state.contracts import ResearchBrief, DomainResult
from src.core.llm import call_llm_json
from src.core.prompts import win_loss_prompt
from src.rag.winloss_signals import win_loss_search

logger = logging.getLogger(__name__)

def _format(results: list[dict]) -> str:
    if not results: return "No results found."
    return "\n\n".join(
        f"Source: {r.get('url','?')}\n"
        f"Title: {r.get('title','?')}\n"
        f"{r.get('content','')[:300]}"
        for r in results[:5]
    )

async def winloss_agent(brief: ResearchBrief) -> DomainResult:
    query = brief.targeted_query
    results = await win_loss_search(query)
    
    messages = [
        {"role": "system", "content": win_loss_prompt(brief.memory_context)},
        {"role": "user", "content": f"Query: {query}\n\nData:\n{_format(results)}"}
    ]
    
    raw_result = await call_llm_json(messages)
    
    return DomainResult(
        domain="win_loss",
        findings=json.dumps(raw_result),
        raw_signals=[r.get('url','') for r in results],
        confidence_score=float(raw_result.get("confidence", 0.75)) if isinstance(raw_result, dict) else 0.5,
        citations=[{"source": r.get("source", "web"), "url": r.get("url")} for r in results[:5]]
    )