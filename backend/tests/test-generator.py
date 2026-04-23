"""
Run this to test the generator completely isolated from the graph.
No Tavily, no domain agents — just mock synthesis output.

Usage:
    cd ~/projects/veracity/ai-backend
    python -m src.agents.generator.test_generator
    # or if you copy this file to root:
    python test_generator.py
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, ".")


MOCK_STATE = {
    # ── Existing fields your synthesis already produces ──────────────────
    "query":      "research Lilian by Vector Agents in the AI SDR market",
    "session_id": "test-session-001",
    "memory_context": "",
    "active_domains": ["market", "competitor", "positioning"],
    "urls": [],

    # Domain outputs (simplified mock)
    "market": {
        "findings": [
            "AI SDR market growing 29.5% CAGR — $4.12B to $15B by 2030",
            "Intent-led positioning completely unoccupied — first mover gap",
            "VP Sales at Series B prioritise pipeline predictability over automation",
        ],
        "confidence": 0.88,
        "citations": [{"url": "marketsandmarkets.com", "title": "AI SDR Report 2025"}],
    },
    "competitor": {
        "findings": [
            "Apollo focuses on volume-based prospecting — no intent signal layer",
            "Outreach G2 reviews: 'feels like spam' cited 4.2x more than intent tools",
            "11x.ai and Artisan ship generic templates — no signal-grounded copy",
            "No competitor claims intent-led SDR positioning — 60-90 day window",
        ],
        "confidence": 0.92,
        "citations": [{"url": "g2.com/apollo", "title": "Apollo G2 Reviews"}],
    },
    "win_loss": {"findings": [], "confidence": 0.5, "citations": []},
    "pricing":  {"findings": [], "confidence": 0.5, "citations": []},
    "positioning": {
        "findings": [
            "Lilian positioned as autonomous AI SDR — but messaging generic",
            "No competitor uses audience language: 'pipeline predictability'",
            "Hiring signal: 847 companies posted SDR roles this week = in-market signal",
        ],
        "confidence": 0.85,
        "citations": [],
    },
    "adjacent": {"findings": [], "confidence": 0.5, "citations": []},

    # Synthesis outputs (what your synthesis node currently produces)
    "summary": (
        "The AI SDR market has a clear first-mover gap: intent-led positioning is unoccupied. "
        "Apollo and Outreach dominate on volume but G2 reviews consistently flag generic outreach "
        "as the top complaint. VP Sales at Series B use 'pipeline predictability' language — "
        "not 'automation' — in 73% of forum posts. 847 companies are actively hiring SDRs "
        "right now, creating an active in-market signal. Lilian's current messaging is generic "
        "and does not exploit this gap."
    ),
    "top_opportunities": [
        "First-mover gap: intent-led SDR positioning unoccupied — 60-90 day window",
        "Audience language mismatch: competitors say 'automation', buyers want 'pipeline predictability'",
        "847 active hiring signals = in-market companies ready for SDR tools today",
    ],
    "top_risks": [
        "Apollo could claim intent positioning within 90 days given their recent AI investment",
        "Generic AI SDR fatigue — buyers becoming skeptical of all AI SDR claims",
    ],
    "recommended_actions": [
        "Launch intent-led positioning campaign targeting VP Sales at Series B immediately",
        "Mirror audience language: lead with 'pipeline predictability' not 'automation'",
        "Target companies with active SDR hiring signals first — highest intent",
    ],
    "low_confidence": [],
    "citations": [],
    "memory": [],

    # ── NEW fields for generator ──────────────────────────────────────────
    "campaign_id":      "campaign-lilian-001",
    "cycle_number":     1,
    "product_context":  "Lilian by Vector Agents — AI SDR that tracks buyer intent signals",
    "target_segment":   "VP Sales at Series B SaaS companies, 50-200 employees",
    "cycle_memory":     [],              # empty on Cycle 1
    "confirmed_hypotheses": [],
    "failed_angles":    [],
    "drafted_variants": {},
    "telemetry":        {},
    "next_action":      "generate",
}

MOCK_STATE_CYCLE_2 = {
    **MOCK_STATE,
    "cycle_number": 2,
    "cycle_memory": [
        {
            "cycle_number": 1,
            "hypothesis": "Intent-led messaging outperforms efficiency messaging 3.1x on reply rate for VP Sales Series B",
            "confirmed": True,
            "segment": "VP Sales · Series B · SaaS",
            "failed_angle": "Efficiency/time-saving angle",
            "best_channel": "email",
            "best_send_time": "Tuesday-Thursday 8-10am",
            "confidence": "high",
            "rule_for_next_cycle": "Both variants must lead with intent language — test depth not angle",
        }
    ],
    "confirmed_hypotheses": [
        "Intent-led messaging outperforms efficiency messaging 3.1x on reply rate for VP Sales Series B"
    ],
    "failed_angles": ["Efficiency/time-saving angle"],
}


async def run_test(cycle: int = 1):
    from src.agents.generator.generation_node import generator_agent

    state = MOCK_STATE if cycle == 1 else MOCK_STATE_CYCLE_2
    print(f"\n{'='*60}")
    print(f"Testing generator — Cycle {cycle}")
    print(f"Memory entries: {len(state['cycle_memory'])}")
    print(f"{'='*60}\n")

    result = await generator_agent(state)

    error = result.get("generation_error")
    if error:
        print(f"ERROR: {error}")
        return

    output = result.get("drafted_variants", {})
    print(json.dumps(output, indent=2))

    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Variants:     {len(output.get('variants', []))}")
    print(f"  Social posts: {len(output.get('social_posts', []))}")
    print(f"  Artifacts:    {len(output.get('artifacts', []))}")
    if output.get("variants"):
        for v in output["variants"]:
            print(f"\n  Variant {v.get('id')}: {v.get('angle')}")
            print(f"    Signal: {v.get('signal_reference', '')[:80]}...")
            print(f"    Subject: {v.get('email_subject', '')}")


if __name__ == "__main__":
    cycle = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    asyncio.run(run_test(cycle))