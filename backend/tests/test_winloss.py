import asyncio
import json
from src.agents.domains.winloss import winloss_agent

async def test_winloss():
    """Test the Win/Loss agent and output results to JSON."""
    
    state = {
        "query": "Managed EDR for mid-market",
        "session_id": "test-winloss-001",
        "memory_context": (
            "Current outreach strategy: Focuses on 'AI-powered threat detection'. "
            "Pricing is seat-based. Average deal cycle is 3 months."
        ),
        "win_loss": {},
        "active_domains": ["win_loss"],
    }

    print("🚀 Initializing Win/Loss & Conversion Signal Test...\n")

    try:
        final_state = await winloss_agent(state)
        result = final_state.get("win_loss", {})

        # Define the output file path
        output_file = "test_output.json"

        # Write the result to a JSON file
        with open(output_file, "w") as f:
            json.dump(result, f, indent=4)

        print("=" * 60)
        print("📈 WIN/LOSS & CONVERSION ANALYSIS COMPLETE")
        print("=" * 60)
        print(f"✅ Results have been saved to {output_file}")
        
        # Also print the JSON to the console for immediate feedback
        print("\nJSON Output:\n")
        print(json.dumps(result, indent=4))

    except Exception as e:
        print(f"❌ Test Failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_winloss())