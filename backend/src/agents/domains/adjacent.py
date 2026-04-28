import asyncio
import json
from src.state.contracts import ResearchBrief, DomainResult
from src.core.llm import call_llm_json
from src.core.prompts import domain_prompt
from src.rag.adjacent_signals import (
    search_audience_intent,
    search_adjacent_markets,
    search_macro_signals,
    search_weak_signals,
    search_competitor_moves,
)
from src.rag.signals import _firecrawl_from_results


def _fmt(results: list[dict], max_results: int = 3) -> str:
    if not results:
        return "No results found."
    return "\n\n".join(
        f"Source: {r.get('url','?')}\nTitle: {r.get('title','?')}\n{r.get('content','')[:300]}"
        for r in results[:max_results]
    )

async def adjacent_agent(brief: ResearchBrief) -> DomainResult:
    """
    Strategic Foresight & Adjacent Market Agent.
    Runs sub-searches in parallel and synthesizes.
    """
    query = brief.targeted_query
    print(f"\n🚀 [Adjacent Agent] Researching: '{query}'")
    logger.info(f"🚀 [Adjacent Agent] Researching: '{query}'")

    
    # ── Phase 1: Sub-searches ─────────────────────────────────────────────
    # We do these directly here instead of using sub-agents to keep the contract clean
    t_intent = search_audience_intent(query)
    t_market = search_adjacent_markets(query)
    t_macro  = search_macro_signals(query)
    t_weak   = search_weak_signals(query)
    t_moves  = search_competitor_moves(query)
    
    results = await asyncio.gather(t_intent, t_market, t_macro, t_weak, t_moves)
    i_res, m_res, ma_res, w_res, mo_res = results
    
    # ── Phase 2: Synthesis ────────────────────────────────────────────────
    all_signals = i_res + m_res + ma_res + w_res + mo_res
    
    result = await call_llm_json([
        {
            "role": "system", 
            "content": domain_prompt("strategic foresight & adjacent threats", brief.memory_context)
        },
        {
            "role": "user", 
            "content": (
                f"Analyze adjacent forces for: {query}\n\n"
                f"INTENT SIGNALS:\n{_fmt(i_res)}\n\n"
                f"ADJACENT MARKETS:\n{_fmt(m_res)}\n\n"
                f"MACRO FORCES:\n{_fmt(ma_res)}\n\n"
                f"WEAK SIGNALS:\n{_fmt(w_res)}\n\n"
                f"COMPETITOR MOVES:\n{_fmt(mo_res)}"
            )
        },
    ])

    return DomainResult(
        domain="adjacent",
        findings=json.dumps(result),
        raw_signals=[r.get('url','') for r in all_signals],
        confidence_score=float(result.get("confidence", 0.7)),
        citations=[{"source": r.get("source", "web"), "url": r.get("url")} for r in all_signals[:5]]
    )