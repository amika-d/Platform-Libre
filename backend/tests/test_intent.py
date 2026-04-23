import asyncio
import json
from src.agents.domains.intent import intent_agent


async def test_intent_agent():
    """Test the full intent agent workflow, including verbatim buyer language output."""

    state = {
        "query": "AI-powered sales outreach automation",
        "session_id": "test-intent-1",
        "memory_context": "User is frustrated with manual prospecting and wants to automate top-of-funnel.",
        "urls": [],
        "market": {},
        "competitor": {},
        "win_loss": {},  # Populated by intent_agent
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
        "active_domains": ["win_loss"],
    }

    print("🚀 Running Buyer Intent Agent...")
    print(f"   Query     : {state['query']}")
    print(f"   Context   : {state['memory_context']}")

    try:
        result_state = await intent_agent(state)
        intent_data = result_state.get("win_loss", {})

        print("\n" + "=" * 64)
        print("📊 BUYER INTENT ANALYSIS COMPLETE")
        print("=" * 64)

        if not intent_data:
            print("⚠️  No intent data was returned from the agent.")
            return

        # ── WHO is in-market ─────────────────────────────────────────────────
        personas = intent_data.get("in_market_personas", [])
        if personas:
            print("\n👤 WHO IS IN-MARKET")
            print("─" * 40)
            for p in personas:
                print(f"  • {p}")

        # ── WHAT they care about ─────────────────────────────────────────────
        priorities = intent_data.get("buyer_priorities", [])
        if priorities:
            print("\n🎯 WHAT THEY CARE ABOUT (ranked)")
            print("─" * 40)
            for i, p in enumerate(priorities, 1):
                print(f"  {i}. {p}")

        # ── In their own words ───────────────────────────────────────────────
        verbatim = intent_data.get("verbatim_phrases", [])
        if verbatim:
            print("\n💬 IN THEIR OWN WORDS")
            print("─" * 40)
            for phrase in verbatim:
                print(f'  "{phrase}"')

        # ── Friction points ──────────────────────────────────────────────────
        friction = intent_data.get("friction_points", [])
        if friction:
            print("\n🚧 FRICTION POINTS")
            print("─" * 40)
            for f in friction:
                print(f"  • {f}")

        # ── Conversion triggers ──────────────────────────────────────────────
        triggers = intent_data.get("conversion_triggers", [])
        if triggers:
            print("\n⚡ CONVERSION TRIGGERS")
            print("─" * 40)
            for t in triggers:
                print(f"  • {t}")

        # ── Messaging angles ─────────────────────────────────────────────────
        angles = intent_data.get("messaging_angles", [])
        if angles:
            print("\n✉️  MESSAGING ANGLES")
            print("─" * 40)
            for a in angles:
                print(f"  • {a}")

        # ── Raw JSON (always last, useful for debugging) ─────────────────────
        print("\n\n🧾 RAW JSON OUTPUT")
        print("─" * 64)
        print(json.dumps(intent_data, indent=2))

    except Exception as e:
        print(f"\n❌ An error occurred during the test: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_intent_agent())