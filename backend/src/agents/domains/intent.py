import json
import re
from src.state.contracts import ResearchBrief, DomainResult
from src.core.llm import call_llm_json
from src.core.prompts import intent_prompt
from src.rag.intent_signals import search_intent


def _extract_quotes(content: str, max_quotes: int = 3, min_len: int = 30) -> list[str]:
    """
    Pull sentence-length fragments that read like first-person buyer voice.
    """
    sentences = re.split(r"(?<=[.!?\n])\s+", content or "")

    triggers = (
        "i ", "we ", "our ", "as a ", "my team", "i'm ", "we're ",
        "i was ", "we were ", "i need", "we need", "i want", "we want",
        "switched", "cancelled", "wish", "the reason", "what sold",
        "the thing", "can't live", "game changer", "killer", "deal breaker",
        "too expensive", "hard to", "looking for", "evaluating",
    )

    quotes = []
    for s in sentences:
        s = s.strip()
        if len(s) < min_len:
            continue
        if any(s.lower().startswith(t) for t in triggers):
            quotes.append(f'"{s}"')
        if len(quotes) >= max_quotes:
            break

    return quotes


def _format(results: list[dict]) -> str:
    if not results:
        return "No results found."

    source_priority = {"firecrawl": 1, "reddit": 2, "hackernews": 3}
    sorted_results = sorted(
        results,
        key=lambda x: source_priority.get(x.get("source", ""), 4),
    )

    sections = []
    for r in sorted_results[:7]:
        content = r.get("content", "")
        snippet = content[:500]
        quotes = _extract_quotes(content)

        block = (
            f"Source: {r.get('url', '?')}\n"
            f"Channel: {r.get('source', '?')}\n"
            f"Title: {r.get('title', '?')}\n"
            f"Content Snippet:\n{snippet}"
        )

        if quotes:
            block += "\n\nVerbatim Buyer Language:\n" + "\n".join(f"  • {q}" for q in quotes)

        sections.append(block)

    return "\n\n" + "─" * 60 + "\n\n".join(sections)


async def intent_agent(brief: ResearchBrief) -> DomainResult:
    """
    Analyzes buyer intent, personas, and verbatims.
    """
    query = brief.targeted_query
    results = await search_intent(query)

    result = await call_llm_json([
        {
            "role": "system",
            "content": intent_prompt(brief.memory_context),
        },
        {
            "role": "user",
            "content": (
                f"Query: {query}\n\n"
                f"Signal Data:\n{_format(results)}"
            ),
        },
    ])

    return DomainResult(
        domain="intent",
        findings=json.dumps(result),
        raw_signals=[r.get('url','') for r in results],
        confidence_score=float(result.get("confidence", 0.75)) if isinstance(result, dict) else 0.5,
        citations=[{"source": r.get("source", "web"), "url": r.get("url")} for r in results[:5]]
    )