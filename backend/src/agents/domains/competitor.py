import json
import logging
import time
import asyncio
import time
from datetime import datetime, timezone

from src.state.contracts import ResearchBrief, DomainResult
from src.core.llm import call_llm_json, _extract_json
from src.core.prompts import competitive_intel_prompt
from src.rag.competitor_signals import (
    _tier1_self_image,
    _tier2_market_image,
    _tier3_unmet_needs,
    _tier4_social_proof,
    _tier5_pricing_gtm,
)
from src.rag.signals import _dedupe_results

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_search_results(results: list[dict]) -> str:
    """Format results for the LLM, grouped by source type for clearer context."""
    if not results:
        return "No results found."

    # Group by source so the LLM sees which signals came from where
    by_source: dict[str, list[dict]] = {}
    for r in results[:12]:
        src = r.get("source", "web").upper()
        by_source.setdefault(src, []).append(r)

    formatted = "SEARCH RESULTS (grouped by source):\n"
    idx = 1
    for source, items in by_source.items():
        formatted += f"\n── {source} ──\n"
        for r in items:
            formatted += f"  [{idx}] {r.get('title', 'No Title')}\n"
            formatted += f"       URL: {r.get('url', '?')}\n"
            formatted += f"       Preview: {r.get('content', '')[:200].strip()}...\n"
            idx += 1
    return formatted


def _build_signal_summary(
    t1: list, t2: list, t3: list, t4: list, t5: list
) -> dict:
    """Per-tier + per-source signal breakdown for the meta block."""
    all_results = t1 + t2 + t3 + t4 + t5

    source_counts: dict[str, int] = {}
    for item in all_results:
        src = item.get("source", "unknown")
        source_counts[src] = source_counts.get(src, 0) + 1

    return {
        "tier1_self_image":   len(t1),
        "tier2_market_image": len(t2),
        "tier3_unmet_needs":  len(t3),
        "tier4_social_proof": len(t4),
        "tier5_pricing_gtm":  len(t5),
        "total_signals":      len(all_results),
        "by_source":          source_counts,
    }


def _build_citations(results: list[dict]) -> list[dict]:
    """Deduplicated citation list with retrieval timestamp."""
    seen: set[str] = set()
    citations = []
    for item in results[:10]:
        url = item.get("url", "")
        if not url or url in seen:
            continue
        seen.add(url)
        citations.append({
            "claim": item.get("title", "Reference"),
            "url": url,
            "source": item.get("source", "web"),
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })
    return citations


def _normalize_market_gaps(raw_gaps: list) -> list[dict]:
    """Ensure every gap has the full granular schema."""
    normalized = []
    for gap in raw_gaps:
        if isinstance(gap, str):
            gap = {"opportunity": gap}
        normalized.append({
            "opportunity":      gap.get("opportunity", "Unknown Opportunity"),
            "severity":         gap.get("severity", "Medium"),          # High/Medium/Low
            "evidence_quote":   gap.get("evidence_quote", "Found in search context"),
            "target_persona":   gap.get("target_persona", "General User"),
            "blue_ocean_action": gap.get("blue_ocean_action", "Create"), # Eliminate/Reduce/Raise/Create
            "competitive_advantage": gap.get("competitive_advantage", ""),
        })
    return normalized


def _normalize_competitors(raw_competitors: list) -> list[dict]:
    """Ensure every competitor entry has the full schema."""
    normalized = []
    for c in raw_competitors:
        if isinstance(c, str):
            c = {"name": c}
        
        # Ensure map_position is a dictionary
        map_position = c.get("map_position", {})
        if not isinstance(map_position, dict):
            map_position = {}

        normalized.append({
            "name":              c.get("name", "Unknown"),
            "url":               c.get("url", ""),
            "positioning":       c.get("positioning", ""),
            "top_claims":        c.get("top_claims", []),
            "messaging_pillars": c.get("messaging_pillars", []),
            "weaknesses":        c.get("weaknesses", []),
            "pricing_model":     c.get("pricing_model", "Unknown"),
            "target_segment":    c.get("target_segment", ""),
            "sentiment_score":   c.get("sentiment_score", "Neutral"),   # Positive/Neutral/Negative
            "threat_level":      c.get("threat_level", "Medium"),       # High/Medium/Low
            "automation_score":  c.get("automation_score", 0.5),
            "market_focus":      c.get("market_focus", 0.5),
            "map_position": {
                "x": map_position.get("x", 0.5),
                "y": map_position.get("y", 0.5),
                "label": map_position.get("label", c.get("name", "Unknown")),
                "color": map_position.get("color", "#888888")
            }
        })
    return normalized


def _normalize_competitor_json(result: dict) -> dict:
    """Robust normalisation of all output blocks directly from a dict."""
    if not isinstance(result, dict):
        return {}

    result["competitors"]  = _normalize_competitors(result.get("competitors", []))
    result["market_gaps"]  = _normalize_market_gaps(result.get("market_gaps", []))
    result.setdefault("strategic_recommendation", "No recommendation provided.")
    result.setdefault("positioning_summary", {})
    result.setdefault("risk_flags", [])
    result.setdefault("actionable_next_steps", [])
    return result


# ---------------------------------------------------------------------------
# Main agent
# ---------------------------------------------------------------------------

async def competitor_agent(brief: ResearchBrief) -> DomainResult:
    """
    Competitor Intelligence Agent.
    """
    run_start = time.perf_counter()
    query: str = brief.targeted_query

    try:
        # ── Phase 1: Signal Gathering ──────────────────────────────────────
        t1, t2, t3, t4, t5 = await asyncio.gather(
            _tier1_self_image(query),
            _tier2_market_image(query),
            _tier3_unmet_needs(query),
            _tier4_social_proof(query),
            _tier5_pricing_gtm(query)
        )
        all_results = _dedupe_results(t1 + t2 + t3 + t4 + t5)

        if not all_results:
            return DomainResult(domain="competitor", findings="No signals found.", confidence_score=0.2)

        # ── Phase 2: Autonomous Scraping & Analysis ─────────────────────────
        # ── Phase 2: Autonomous Scraping & Analysis ─────────────────────────
        result = await call_llm_json([
            {
                "role": "system",
                "content": competitive_intel_prompt(brief.memory_context),
            },
            {
                "role": "user",
                "content": (
                    f"QUERY: {query}\n\n"
                    f"{_format_search_results(all_results)}\n\n"
                    "TASK: Perform a full competitive intelligence analysis. "
                    "Return ONLY valid JSON."
                ),
            },
        ])

        # ── Phase 3: Parse & Return ────────────────────────────────────────
        result = _normalize_competitor_json(result)
        
        return DomainResult(
            domain="competitor",
            findings=json.dumps(result),
            raw_signals=[r.get("url", "") for r in all_results],
            confidence_score=float(result.get("confidence", 0.7)) if result else 0.5,
            citations=_build_citations(all_results)
        )

    except Exception as exc:
        logger.error("❌ Competitor agent error: %s", exc, exc_info=True)
        return DomainResult(domain="competitor", error=str(exc), confidence_score=0.0)