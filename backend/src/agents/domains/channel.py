import logging
import json
from datetime import datetime, timezone
import asyncio
from src.state.contracts import ResearchBrief, DomainResult
from src.core.llm import call_llm_json
from src.core.prompts import channel_intel_prompt
from src.rag.channel_signals import (
    search_channels,
    search_campaign_performance,
    search_resource_allocation,
)

logger = logging.getLogger(__name__)

def _format_search_results(results: list[dict]) -> str:
    if not results:
        return "No results found."
    formatted = ""
    for i, r in enumerate(results[:8], 1):
        formatted += f"\n[{i}] {r.get('title', 'No Title')}\n"
        formatted += f"    URL: {r.get('url', '?')}\n"
        formatted += f"    Content: {r.get('content', '')[:300]}...\n"
    return formatted

def _build_citations(all_results: list[dict]) -> list[dict]:
    seen_urls = set()
    citations = []
    for item in all_results[:8]:
        url = item.get("url")
        if url and url not in seen_urls:
            seen_urls.add(url)
            citations.append({
                "source": item.get("source", "Web"),
                "url": url,
            })
    return citations

async def channel_agent(brief: ResearchBrief) -> DomainResult:
    """
    Channel Intelligence Agent.
    """
    query = brief.targeted_query
    print(f"\n🚀 [Channel Agent] Researching: '{query}'")

    # ── Step 1: Signal Gathering ──────────────────────────────────────────
    t1, t2, t3 = await asyncio.gather(
        search_channels(query),
        search_campaign_performance(query),
        search_resource_allocation(query)
    )
    all_results = t1 + t2 + t3

    if not all_results:
        return DomainResult(domain="channel", findings="No signals found.", confidence_score=0.2)

    # ── Step 2: LLM Analysis ──────────────────────────────────────────────
    result = await call_llm_json([
        {
            "role": "system",
            "content": channel_intel_prompt(brief.memory_context),
        },
        {
            "role": "user",
            "content": (
                f"Query: {query}\n\n"
                f"Analyze these signals:\n{_format_search_results(all_results)}"
            ),
        },
    ])

    return DomainResult(
        domain="channel",
        findings=json.dumps(result),
        raw_signals=[r.get('url','') for r in all_results],
        confidence_score=float(result.get("confidence", 0.7)),
        citations=_build_citations(all_results)
    )