import asyncio
import re
import time

from src.state.agent_state import AgentState
from src.state.contracts import ResearchBrief, DomainResult, SynthesisOutput
from src.core.llm import call_llm_json
from src.core.config import settings

from src.agents.domains.market import market_agent
from src.agents.domains.competitor import competitor_agent
from src.agents.domains.winloss import winloss_agent
from src.agents.domains.positioning import positioning_agent
from src.agents.domains.adjacent import adjacent_agent
from src.agents.domains.channel import channel_agent
from src.agents.domains.contextual import contextual_agent
from src.agents.domains.intent import intent_agent
from src.agents.domains.synthesis import synthesis_agent


ALL_DOMAINS = [
    "market", "competitor", "win_loss",
    "positioning", "adjacent", "channel", "contextual", "intent",
]

DOMAIN_MAP = {
    "market":      market_agent,
    "competitor":  competitor_agent,
    "win_loss":    winloss_agent,
    "positioning": positioning_agent,
    "adjacent":    adjacent_agent,
    "channel":     channel_agent,
    "contextual":  contextual_agent,
    "intent":      intent_agent,
}

ROUTING_SYSTEM_PROMPT = """\
You are the Research Director for a growth intelligence system.
Given a user request, decide which domains to research AND generate a targeted research query.

Available domains:
  market      → market trends, category direction, leading indicators
  competitor  → competitive landscape, feature bets, alternatives
  win_loss    → why users switch, churn reasons, buyer perspective
  positioning → messaging gaps, value proposition, homepage copy
  adjacent    → new entrants, funding news, disruption threats
  channel     → marketing channels, campaign ROI, where to focus spend
  contextual  → surrounding environment, external factors
  intent      → buyer intent signals, purpose behind actions

Rules:
1. TARGETED QUERY: Generate a query for the PRODUCT and MARKET — not the user's raw request.
2. NEVER add 'adjacent' unless the user explicitly asks about market threats or new entrants.
3. If the depth is 'deep', prioritize more domains (4-5) which are most relevant; if 'quick', focus on 1-2 core domains.

Return ONLY valid JSON:
{
  "active_domains": ["domain1", "domain2"],
  "targeted_query": "specific search query",
  "reasoning": "one sentence"
}
"""


def _build_memory_context(state: AgentState) -> str:
    confirmed  = state.get("confirmed_hypotheses", [])
    failed     = state.get("failed_angles", [])
    cycle_mem  = state.get("cycle_memory", [])
    rules      = [m.get("rule_for_next_cycle", "") for m in cycle_mem if m.get("rule_for_next_cycle")]

    lines = []
    if confirmed:
        lines.append("CONFIRMED TRUE (double down on these signals):")
        lines.extend(f"  ✓ {h}" for h in confirmed)
    if failed:
        lines.append("CONFIRMED FAILED (do not research these angles):")
        lines.extend(f"  ✗ {a}" for a in failed)
    if rules:
        lines.append("CONSTRAINTS FROM LAST CYCLE:")
        lines.extend(f"  → {r}" for r in rules)

    return "\n".join(lines)


async def _plan_domains(state: AgentState, memory_context: str) -> tuple[list[str], str, str]:
    """
    Returns (active_domains, targeted_query, reasoning).
    Uses caller-specified domains when provided; otherwise asks the LLM.
    """
    requested = state.get("tool_input", {}).get("domains", [])

    if requested:
        active_domains  = [d for d in requested if d in ALL_DOMAINS]
        targeted_query  = state.get("tool_input", {}).get("angle") or state["query"]
        reasoning       = "Using caller-specified domains"
    else:
        plan = await call_llm_json([
            {"role": "system", "content": ROUTING_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"User Request: {state['query']}\n"
                    f"Product Context: {state.get('product_context', '')}\n"
                    f"Confirmed Hypotheses: {state.get('confirmed_hypotheses', [])}\n"
                    f"Depth: {state.get('research_depth', 'quick')}\n"
                    f"Cycle: {state.get('cycle_number', 1)}\n"
                    f"Memory:\n{memory_context if memory_context else 'No prior cycles yet.'}\n"
                ),
            },
        ])
        active_domains  = [d for d in plan.get("active_domains", []) if d in ALL_DOMAINS]
        targeted_query  = plan.get("targeted_query", state["query"])
        reasoning       = plan.get("reasoning", "")

    if "competitor" not in active_domains:
        active_domains.append("competitor")

    return active_domains, targeted_query, reasoning


async def _run_domain(name: str, agent_fn, brief: ResearchBrief) -> DomainResult:
    start = time.perf_counter()
    print(f"  🔬 [{name}] Starting...")
    try:
        result = await agent_fn(brief)
        elapsed = time.perf_counter() - start
        print(f"  ✅ [{name}] Complete — confidence: {result.confidence_score} ({elapsed:.2f}s)")
        return result
    except Exception as e:
        print(f"  ❌ [{name}] Failed: {e}")
        return DomainResult(domain=name, error=str(e))


async def supervisor(state: AgentState) -> AgentState:
    """
    Primary Research Orchestrator.

    Phase 1 — Briefing & Routing : Plans domains + generates a targeted query.
    Phase 2 — Parallel Execution : Runs domain agents using typed contracts.
    Phase 3 — Synthesis          : Receives SynthesisOutput, writes to state.
    """

    # ── Phase 1: Briefing & Routing ──────────────────────────────────────────
    active_domains, targeted_query, _ = await _plan_domains(state, _build_memory_context(state))
    print(f"[supervisor] Domains: {active_domains} | Query: {targeted_query}")

    brief = ResearchBrief(
        product_context=state.get("product_context", ""),
        targeted_query=targeted_query,
        depth=state.get("research_depth", "quick"),
        memory_context=_build_memory_context(state),
        urls=re.findall(r"https?://[^\s]+", state["query"]),
    )

    # ── Phase 2: Parallel Execution ───────────────────────────────────────────
    tasks = [
        _run_domain(name, DOMAIN_MAP[name], brief)
        for name in active_domains
        if name in DOMAIN_MAP
    ]
    domain_results: list[DomainResult] = await asyncio.gather(*tasks)

    succeeded = sum(1 for d in domain_results if not d.error)
    print(f"[supervisor] Completed: {succeeded}/{len(tasks)} domains")

    # ── Phase 3: Synthesis ───────────────────────────────────────────────────
    synthesis: SynthesisOutput = await synthesis_agent(
        domain_results=domain_results,
        query=state["query"],
        session_id=state["session_id"],
        model=settings.SYNTHESIS_MODEL,
    )

    print(f"[supervisor] Synthesis: {synthesis.summary[:120]}...")
    if synthesis.domains_failed:
        print(f"[supervisor] ⚠ Failed domains: {synthesis.domains_failed}")

    # ── Phase 4: Write to State ───────────────────────────────────────────────
    updated = {**state}

    for dr in domain_results:
        if not dr.error:
            updated[dr.domain] = {
                "findings":  dr.findings,
                "signals":   dr.raw_signals,
                "citations": dr.citations,
            }

    existing_summary = state.get("summary", "")
    updated["summary"] = (
        f"{existing_summary}\n\n---\n\n{synthesis.summary}"
        if existing_summary else synthesis.summary
    )

    updated["top_opportunities"] = list(set(
        state.get("top_opportunities", []) + synthesis.top_opportunities
    ))

    updated.update({
        "top_risks":           synthesis.top_risks,
        "recommended_actions": synthesis.recommended_actions,
        "citations":           synthesis.citations,
        "active_domains":      active_domains,
        "targeted_query":      targeted_query,
    })

    return updated