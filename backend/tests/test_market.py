"""
Test the enhanced market agent in isolation.
Run: python test_market.py
"""
import asyncio
import json
import os


async def test_market():
    """Test enhanced market agent with all 8 signal sources."""
    if not os.getenv("ALPHA_VANTAGE_API_KEY"):
        os.environ["ALPHA_VANTAGE_API_KEY"] = "demo"

    from src.agents.domains.market import market_agent

    state = {
        "query": "marketing campaign of Fintech startups in 2026",
        "session_id": "test-market-1",
        "memory_context": "",
        "urls": [],
        "market": {},
        "competitor": {},
        "win_loss": {},
        "pricing": {},
        "positioning": {},
        "adjacent": {},
        "summary": "",
        "top_opportunities": [],
        "top_risks": [],
        "recommended_actions": [],
        "low_confidence": [],
        "citations": [],
        "memory": [],
        "active_domains": ["market"],
    }

    print("🚀 Running Enhanced Market Agent...\n")
    try:
        result = await market_agent(state)
        market_data = result.get("market", {})

        if not market_data:
            print("❌ No market data returned")
            return

        # ── Narrative Summary ────────────────────────────────────────────────
        print("\n" + "="*65)
        print("NARRATIVE SUMMARY")
        print("="*65)
        summary = market_data.get("narrative_summary", {})
        print(f"One-liner : {summary.get('one_line', '—')}")
        print(f"Urgency   : {summary.get('urgency_level', '—')} — {summary.get('urgency_reason', '')}")
        print(f"\nMarket moment:\n{summary.get('market_moment', '—')}")

        # ── PESTEL ───────────────────────────────────────────────────────────
        print("\n" + "="*65)
        print("PESTEL ANALYSIS")
        print("="*65)
        pestel = market_data.get("pestel", {})
        for node, data in pestel.items():
            conf = data.get("confidence", "?")
            print(f"\n[{node.upper()}] — confidence: {conf}")
            print(f"  {data.get('summary', '—')}")
            for signal in data.get("signals", [])[:3]:
                print(f"  • {signal}")

        # ── Competitive Intelligence ─────────────────────────────────────────
        print("\n" + "="*65)
        print("COMPETITIVE INTELLIGENCE")
        print("="*65)
        comp = market_data.get("competitive_intelligence", {})
        for competitor in comp.get("top_competitors", []):
            print(f"\n  {competitor.get('name', 'Unknown')}")
            print(f"  Positioning  : {competitor.get('positioning', '—')}")
            print(f"  Recent moves : {competitor.get('recent_moves', '—')}")
            print(f"  Weakness     : {competitor.get('weakness', '—')}")
        whitespace = comp.get("whitespace_opportunities", [])
        if whitespace:
            print(f"\n  Whitespace opportunities:")
            for w in whitespace:
                print(f"  → {w}")

        # ── Audience Intelligence ────────────────────────────────────────────
        print("\n" + "="*65)
        print("AUDIENCE INTELLIGENCE")
        print("="*65)
        audience = market_data.get("audience_intelligence", {})
        verbatim = audience.get("verbatim_language", [])
        if verbatim:
            print("\n  Verbatim customer language (use in copy):")
            for phrase in verbatim:
                print(f'  "{phrase}"')
        for seg in audience.get("primary_segments", []):
            print(f"\n  Segment: {seg.get('segment', '—')}")
            print(f"  JTBD    : {seg.get('jobs_to_be_done', '—')}")
            for f in seg.get("friction_points", [])[:2]:
                print(f"  ⚡ {f}")

        # ── Campaign Signals ─────────────────────────────────────────────────
        print("\n" + "="*65)
        print("CAMPAIGN SIGNALS")
        print("="*65)
        campaigns = market_data.get("campaign_signals", {})
        print(f"  Winning themes  : {campaigns.get('winning_themes', [])}")
        print(f"  Winning formats : {campaigns.get('winning_formats', [])}")
        print(f"  Viral hooks     : {campaigns.get('viral_hooks_observed', [])}")

        # ── Recommended Actions ──────────────────────────────────────────────
        print("\n" + "="*65)
        print("RECOMMENDED ACTIONS")
        print("="*65)
        for action in market_data.get("recommended_actions", []):
            priority = action.get("priority", "?")
            effort = action.get("effort", "?")
            flag = "🔥" if priority == "P1" else ("⚡" if priority == "P2" else "📌")
            print(f"\n  {flag} [{priority}] {action.get('action', '?')}")
            print(f"     Effort    : {effort}")
            print(f"     Rationale : {action.get('rationale', '—')}")

        # ── Signal Quality ───────────────────────────────────────────────────
        print("\n" + "="*65)
        print("SIGNAL QUALITY")
        print("="*65)
        sq = market_data.get("signal_quality", {})
        print(f"  Sources used   : {sq.get('total_sources_used', '—')}")
        print(f"  Breakdown      : {sq.get('source_breakdown', {})}")
        print(f"  Coverage gaps  : {sq.get('coverage_gaps', [])}")

        # ── Full JSON dump ───────────────────────────────────────────────────
        print("\n" + "="*65)
        print("FULL JSON OUTPUT")
        print("="*65)
        print(json.dumps(market_data, indent=2))

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_market())