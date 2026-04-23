import asyncio
import json
import logging
from src.state.agent_state import AgentState

# Import all domain agents
from src.agents.domains.market import market_agent
from src.agents.domains.competitor import competitor_agent
from src.agents.domains.positioning import positioning_agent
from src.agents.domains.winloss import winloss_agent
from src.agents.domains.channel import channel_agent
from src.agents.domains.adjacent import adjacent_agent
from src.agents.domains.contextual import contextual_agent
from src.agents.domains.intent import intent_agent
from src.agents.domains.synthesis import synthesis_agent

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def run_full_analysis():
    """
    Runs all domain agents in parallel, then synthesizes the results.
    """
    # 1. Define Initial State
    initial_state: AgentState = {
        "query": "What are the latest trends in AI-powered cybersecurity solutions?",
        "session_id": "full-analysis-001",
        "memory_context": "Initial query for a comprehensive market analysis.",
        "active_domains": ["market", "competitor", "positioning", "win_loss", "channel", "adjacent", "contextual", "intent"],
    }

    print("🚀 Starting Full Strategic Analysis...")
    print(f"Query: {initial_state['query']}\n")

    try:
        # 2. Run all domain agents in parallel
        domain_agents = [
            market_agent,
            competitor_agent,
            positioning_agent,
            winloss_agent,
            channel_agent,
            adjacent_agent,
            contextual_agent,
            intent_agent,
        ]

        # Create tasks for each domain agent
        tasks = [agent(initial_state) for agent in domain_agents]
        
        # Run tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 3. Consolidate results into a single state object
        final_state = initial_state.copy()
        for result in results:
            if isinstance(result, Exception):
                logging.error(f"An agent failed with an exception: {result}")
                # Continue with the results that were successful
                continue
            if isinstance(result, dict):
                final_state.update(result)

        # 4. Run the Synthesis Agent
        print("\n🧠 Synthesizing results from all domains...")
        print("\n" + "="*30 + " STATE BEFORE SYNTHESIS " + "="*30)
        print(json.dumps(final_state, indent=2, default=str))
        print("="*80 + "\n")

        synthesis_result_state = await synthesis_agent(final_state)

        # 5. Save the final output
        output_file = "strategic_analysis_output.json"
        
        # Extract synthesized data
        synthesis_output = {
            "summary": synthesis_result_state.get("summary", ""),
            "top_opportunities": synthesis_result_state.get("top_opportunities", []),
            "top_risks": synthesis_result_state.get("top_risks", []),
            "recommended_actions": synthesis_result_state.get("recommended_actions", []),
            "citations": synthesis_result_state.get("citations", []),
        }
                
        with open(output_file, "w") as f:
            # We only want to save the synthesis part
            json.dump(synthesis_output, f, indent=4)

        print("\n" + "="*60)
        print("🎉 STRATEGIC ANALYSIS COMPLETE")
        print("="*60)
        print(f"✅ Full synthesized analysis saved to {output_file}")

        # Also print the synthesis to console
        print("\nFinal Synthesis:\n")
        print(json.dumps(synthesis_output, indent=4))

    except Exception as e:
        logging.error(f"❌ The analysis pipeline failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_full_analysis())
