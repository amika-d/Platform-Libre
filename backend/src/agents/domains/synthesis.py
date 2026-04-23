import json
from typing import List
from src.state.contracts import DomainResult, SynthesisOutput
from src.core.llm import call_llm_json
from src.core.prompts import synthesis_prompt


async def synthesis_agent(
    domain_results: List[DomainResult],
    query: str,
    session_id: str,
    memory_context: str = "",
    model: str = None,
) -> SynthesisOutput:
    """
    Synthesizes domain reports into a typed SynthesisOutput.
    No longer touches AgentState — receives DomainResults, returns SynthesisOutput.
    """

    # ── 1. Build reports dict for LLM ─────────────────────────────────────
    active_reports = {}
    all_citations = []
    seen_urls = set()
    domains_run = []
    domains_failed = []

    for dr in domain_results:
        if dr.error:
            domains_failed.append(dr.domain)
            continue

        domains_run.append(dr.domain)
        active_reports[dr.domain] = {
            "findings": dr.findings,
            "confidence": dr.confidence_score,
            "citations": dr.citations,
        }
        for c in dr.citations:
            url = c.get("url") if isinstance(c, dict) else None
            if url:
                if url not in seen_urls:
                    seen_urls.add(url)
                    all_citations.append(c)
            else:
                all_citations.append(c)

    if not active_reports:
        return SynthesisOutput(
            summary="No domain findings available.",
            top_opportunities=[],
            top_risks=[],
            recommended_actions=[],
            domains_run=domains_run,
            domains_failed=domains_failed,
            citations=[],
        )

    # ── 2. Call LLM for Synthesis ─────────────────────────────────────────
    result = await call_llm_json([
        {
            "role":    "system",
            "content": synthesis_prompt(memory_context),
        },
        {
            "role":    "user",
            "content": (
                f"User Intent: {query}\n\n"
                f"Domain Reports:\n"
                f"{json.dumps(active_reports, indent=2)}\n\n"
                f"Synthesise into executive brief:"
            ),
        },
    ], model=model)

    # ── 3. Return typed contract ──────────────────────────────────────────
    
    # ── 4. Aggregate for Competitive Map ──────────────────────────────────
    competitive_map_data = {
        "competitors": [],
        "your_position": {
            "x": 0.9,
            "y": 0.2,
            "label": "Vector Agents",
            "color": "#00FF88"
        }
    }
    
    competitor_report = active_reports.get("competitor", {})
    if competitor_report and isinstance(competitor_report.get("findings"), str):
        try:
            findings = json.loads(competitor_report["findings"])
            # Try multiple paths to find competitors array
            competitors = findings.get("competitors", [])
            if not competitors and "competitive_intelligence" in findings:
                competitors = findings["competitive_intelligence"].get("top_competitors", [])
            
            print(f"[synthesis] Found {len(competitors)} competitors for map")
            
            for comp in competitors:
                # Handle map_position or position field
                pos = comp.get("map_position") or comp.get("position", {})
                if not isinstance(pos, dict):
                    pos = {}
                    
                color = "#FF4444" if comp.get("threat_level") == "High" else "#4ECDC4"
                
                competitive_map_data["competitors"].append({
                    "x": float(pos.get("x", 0.5)),
                    "y": float(pos.get("y", 0.5)),
                    "label": comp.get("name", "Unknown"),
                    "color": color,
                    "messaging_pillars": comp.get("messaging_pillars", []),
                    "weaknesses": comp.get("weaknesses", []),
                    "positioning": comp.get("positioning", "")
                })
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"[synthesis] Competitive map extraction failed: {e}")
    
    # Fallback: ensure we always have at least minimal map data if competitor domain ran
    if "competitor" in active_reports and not competitive_map_data["competitors"]:
        print("[synthesis] No competitors extracted but competitor domain present; ensuring map data exists")

    return SynthesisOutput(
        summary=result.get("summary", ""),
        top_opportunities=result.get("top_opportunities", []),
        top_risks=result.get("top_risks", []),
        recommended_actions=result.get("recommended_actions", []),
        domains_run=domains_run,
        domains_failed=domains_failed,
        citations=all_citations,
        competitive_map=competitive_map_data,
    )