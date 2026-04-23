import asyncio
import json
from src.agents.generator.nodes import competitive_map_node

async def run_mock_test():
    # 1. Create a mocked state simulating what the Synthesis agent would output
    # after a successful research phase.
    print("🔧 Injecting mock competitive map data into state...")
    
    mock_state = {
        "_loop_count": 1,
        "query": "show me the competitive map",
        "competitive_map": {
            "competitors": [
                {
                    "name": "LegacyCorp",
                    "threat_level": "High",
                    "map_position": {
                        "x": 0.8,
                        "y": 0.1,
                        "label": "LegacyCorp",
                        "color": "#FF4444"
                    }
                },
                {
                    "name": "AgileStart",
                    "threat_level": "Medium",
                    "map_position": {
                        "x": 0.3,
                        "y": 0.7,
                        "label": "AgileStart",
                        "color": "#888888"
                    }
                }
            ],
            "your_position": {
                "x": 0.9,
                "y": 0.9,
                "label": "Our Awesome Product",
                "color": "#00FF88"
            }
        }
    }

    # 2. Pass the mock state to the node
    print("🚀 Running competitive_map_node...\n")
    result = await competitive_map_node(mock_state)
    
    # 3. Output the result to verify the format
    print("✅ Resulting State Update:")
    print(json.dumps(result, indent=2))
    
    # Verify the structure
    if "drafted_variants" in result and "competitive_map" in result["drafted_variants"]:
        print("\n🎉 Success: The node successfully extracted and formatted the map data into drafted_variants!")
    else:
        print("\n❌ Failure: Data was not formatted correctly.")

if __name__ == "__main__":
    asyncio.run(run_mock_test())
