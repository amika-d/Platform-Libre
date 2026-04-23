# src/agents/outreach/find_prospects.py

import json
from tavily import AsyncTavilyClient
from src.state.agent_state import AgentState
from src.core.config import settings
from src.core.llm import call_llm_json

async def find_prospects_node(state: AgentState) -> AgentState:
    print("--- NODE: find_prospects ---")
    
    segment = state.get("target_segment", "")
    product = state.get("product_context", "")
    client  = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)

    # Google X-Ray query — finds LinkedIn profiles matching segment
    query = f'site:linkedin.com/in "{segment}" "{segment.split()[0]}"'
    print(f"[find_prospects] X-Ray query: {query}")

    results = await client.search(
        query=query,
        max_results=25,  # grab more than needed, LLM will filter
        search_depth="basic",
    )

    raw_urls = [
        {"url": r["url"], "snippet": r.get("content", "")}
        for r in results.get("results", [])
        if "linkedin.com/in/" in r["url"]
    ]

    print(f"[find_prospects] Found {len(raw_urls)} raw LinkedIn URLs")

    if not raw_urls:
        return {**state, "approved_prospects": [], "outreach_status": []}

    # LLM parses names/titles from snippets
    parsed = await call_llm_json([
        {
            "role": "system",
            "content": """Extract structured prospect data from LinkedIn search snippets.
Only include people who clearly match the target segment.
Output JSON:
{
  "prospects": [
    {
      "name":         "Full Name",
      "title":        "Job Title",
      "company":      "Company Name",
      "linkedin_url": "https://linkedin.com/in/..."
    }
  ]
}
Exclude anyone whose title does not match the segment. Max 20 prospects."""
        },
        {
            "role": "user",
            "content": (
                f"Target segment: {segment}\n"
                f"Product: {product}\n\n"
                f"Raw results:\n{json.dumps(raw_urls, indent=2)}"
            )
        }
    ])

    prospects = parsed.get("prospects", [])[:20]  # hard cap at 20 — LinkedIn daily limit
    print(f"[find_prospects] Filtered to {len(prospects)} prospects")

    # Init outreach_status tracking for each prospect
    outreach_status = [
        {
            "linkedin_url":  p["linkedin_url"],
            "name":          p["name"],
            "status":        "pending",       # pending → request_sent → accepted → messaged
            "sent_at":       None,
            "accepted_at":   None,
            "message_sent":  False,
            "variant_used":  None,
        }
        for p in prospects
    ]

    return {
        **state,
        "approved_prospects": prospects,
        "outreach_status":    outreach_status,
    }