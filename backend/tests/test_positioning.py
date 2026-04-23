import asyncio
import json
from src.agents.domains.positioning import positioning_agent


async def test_positioning():
    """Test contextual & temporal signals agent in isolation."""

    state = {
        "query": "B2B project management software for SMB teams",
        "session_id": "test-positioning-1",
        "memory_context": (
            "Campaign goal: improve conversion for Q3 pipeline. "
            "Need timing-aware messaging around budget approvals and market events."
        ),
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
        "active_domains": ["positioning"],
    }

    print("🚀 Running Contextual & Temporal Signals Agent...\n")

    try:
        result_state = await positioning_agent(state)
        result = result_state.get("positioning", {})

        print("=" * 64)
        print("📊 CONTEXTUAL & TEMPORAL SIGNALS OUTPUT")
        print("=" * 64)

        if not result:
            print("⚠️ No positioning/contextual data returned")
            return

        # Print raw JSON for debugging and copy/paste.
        print("\n🧾 Raw JSON:")
        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_positioning())
