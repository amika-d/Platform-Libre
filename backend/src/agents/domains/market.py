import json
from src.state.contracts import ResearchBrief, DomainResult
from src.core.llm import call_llm_json
from src.rag.market_signals import search_market
import re

def _looks_like_stock_query(query: str) -> bool:
    """Only use Alpha Vantage if query looks like a ticker or financial instrument."""
    ticker_pattern = r'\b[A-Z]{1,5}\b'
    financial_keywords = {"stock", "ticker", "share", "equity", "nasdaq", "nyse", "market cap"}
    has_ticker = bool(re.search(ticker_pattern, query))
    has_keyword = any(kw in query.lower() for kw in financial_keywords)
    return has_ticker or has_keyword

# ─────────────────────────────────────────────
# Result Formatter
# ─────────────────────────────────────────────

_SOURCE_EMOJI = {
    "alpha_vantage":      "📈",
    "competitor_content": "🎯",
    "audience_forums":    "💬",
    "job_postings":       "💼",
    "funding_activity":   "💰",
    "search_trends":      "🔎",
    "campaign_engagement":"📣",
    "google":             "🌐",
    "hn":                 "🟠",
}

_SIGNAL_TYPE_PESTEL = {
    "economic":          "Economic",
    "competitive":       "Competitive",
    "social":            "Social",
    "organizational":    "Economic/Technological",
    "demand":            "Technological/Social",
    "social_performance":"Social",
}


def _format_results(results: list[dict], max_per_source: int = 3) -> str:
    """
    Formats signals grouped by source type so the LLM can weight them correctly.
    Each source gets a labelled block with its PESTEL node annotated.
    """
    if not results:
        return "No signals found."

    # Group by source
    grouped: dict[str, list[dict]] = {}
    for r in results:
        src = r.get("source", "unknown")
        grouped.setdefault(src, []).append(r)

    blocks: list[str] = []
    for source, items in grouped.items():
        emoji = _SOURCE_EMOJI.get(source, "📌")
        signal_type = items[0].get("signal_type", "")
        pestel_node = _SIGNAL_TYPE_PESTEL.get(signal_type, "General")

        header = f"{emoji} SOURCE: {source.upper().replace('_', ' ')} [PESTEL: {pestel_node}]"
        separator = "─" * len(header)

        source_items = items[:max_per_source]
        item_texts = []
        for r in source_items:
            url = r.get("url", "?")
            title = r.get("title", "?")
            content = r.get("content", "")[:300]
            item_texts.append(f"  URL: {url}\n  Title: {title}\n  Excerpt: {content}")

        blocks.append(f"{header}\n{separator}\n" + "\n\n".join(item_texts))

    return "\n\n\n".join(blocks)


# ─────────────────────────────────────────────
# Market Agent
# ─────────────────────────────────────────────

async def market_agent(brief: ResearchBrief) -> DomainResult:
    """
    Full-spectrum market intelligence agent.
    """
    query = brief.targeted_query

    # ── Step 1: Deep Signal Gathering ───────────────────────────────────────
    print(f"\n🚀 [Market Agent] Researching: '{query}'")

    # Gate Alpha Vantage — skip for SaaS/startup queries
    results = await search_market(query, skip_alpha_vantage=not _looks_like_stock_query(query))

    # ── Step 2: Build LLM Context ────────────────────────────────────────────
    formatted_signals = _format_results(results, max_per_source=3)
    from src.core.prompts import market_pestel_prompt  # noqa: PLC0415

    # ── Step 3: Intelligence Synthesis ──────────────────────────────────────
    result = await call_llm_json([
        {
            "role": "system",
            "content": market_pestel_prompt(brief.memory_context),
        },
        {
            "role": "user",
            "content": (
                f"Query: {query}\n\n"
                f"Signals:\n{formatted_signals}"
            ),
        },
    ])

    if result:
        one_line = result.get("narrative_summary", {}).get("one_line", "—")
        print(f"💡 [Market Agent] Summary: {one_line}")

    return DomainResult(
        domain="market",
        findings=json.dumps(result) if result else "{}",
        raw_signals=[r.get("url", "") for r in results],
        confidence_score=float(result.get("confidence", 0.5)) if result else 0.0,
        citations=[{"source": r.get("source"), "url": r.get("url")} for r in results[:5]]
    )