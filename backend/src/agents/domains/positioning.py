import json
from src.state.contracts import ResearchBrief, DomainResult
from src.core.llm import call_llm_json
from src.core.prompts import domain_prompt
from src.rag.positioning_signals import positioning_search

def _format(results: list[dict]) -> str:
    if not results:
        return "No results found."
    return "\n\n".join(
        f"Source: {r.get('url','?')}\n"
        f"Title:  {r.get('title','?')}\n"
        f"{r.get('content','')[:200]}"
        for r in results[:4]
    )


async def positioning_agent(brief: ResearchBrief) -> DomainResult:
    """
    Positioning Intelligence Agent.
    """
    query = brief.targeted_query
    results = await positioning_search(query)

    # Add any direct URLs from the brief
    extra = []
    for url in brief.urls:
        extra.append({
            "url":     url,
            "title":   "Direct URL",
            "content": "",
            "source":  "user",
        })

    try:
        result = await call_llm_json([
            {
                "role":    "system",
                "content": domain_prompt("positioning & messaging analysis", brief.memory_context)
            },
            {
                "role":    "user",
                "content": (
                    f"Query: {query}\n\n"
                    f"Results:\n{_format(results + extra)}\n\n"
                    f"Identify messaging gaps, value proposition opportunities, "
                    f"and brand positioning. Return ONLY valid JSON."
                )
            },
        ])
    except ValueError as exc:
        return DomainResult(
            domain="positioning",
            findings="{}",
            raw_signals=[r.get("url", "") for r in results + extra],
            confidence_score=0.0,
            error=str(exc),
        )

    return DomainResult(
        domain="positioning",
        findings=json.dumps(result),
        raw_signals=[r.get('url','') for r in results + extra],
        confidence_score=float(result.get("confidence", 0.7)),
        citations=[{"source": r.get("source", "web"), "url": r.get("url")} for r in results[:4]]
    )