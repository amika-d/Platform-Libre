# src/agents/outreach/search_prospects.py
"""
Search for prospects on LinkedIn using Tavily based on user query.
Returns raw candidate prospects awaiting approval.
"""

import json
from tavily import AsyncTavilyClient
from src.state.agent_state import AgentState
from src.core.config import settings
from src.core.llm import call_llm_json


async def search_prospects_node(state: AgentState) -> AgentState:
    """
    Search for LinkedIn prospects using Tavily based on the user query.
    Extracts candidate prospects and returns them for approval.
    
    Expected state inputs:
    - query: User search query (e.g., "CMOs at B2B SaaS companies in Southeast")
    - product_context: Product/solution description
    
    Returns state with:
    - candidate_prospects: List of prospects found (awaiting approval)
    """
    print("--- NODE: search_prospects ---")
    
    query = state.get("query", "")
    product = state.get("product_context", "")
    
    if not query:
        print("[search_prospects] No query provided")
        return {**state, "candidate_prospects": []}
    
    client = AsyncTavilyClient(api_key=settings.TAVILY_API_KEY)

    # Build LinkedIn search query from user input
    # Combine user query with LinkedIn site search
    tavily_query = f'site:linkedin.com/in {query}'
    print(f"[search_prospects] Tavily query: {tavily_query}")

    try:
        results = await client.search(
            query=tavily_query,
            max_results=40,  # grab more than needed, LLM will filter
            search_depth="basic",
        )
    except Exception as e:
        print(f"[search_prospects] Tavily search error: {e}")
        return {**state, "candidate_prospects": []}

    raw_urls = [
        {"url": r["url"], "snippet": r.get("content", "")}
        for r in results.get("results", [])
        if "linkedin.com/in/" in r["url"]
    ]

    print(f"[search_prospects] Found {len(raw_urls)} raw LinkedIn URLs")

    if not raw_urls:
        return {**state, "candidate_prospects": []}

    # LLM extracts structured prospect data from snippets
    parsed = await call_llm_json([
        {
            "role": "system",
            "content": f"""Extract structured prospect data from LinkedIn search snippets.
Filter for profiles that match: {query}
Output valid JSON only:
{{
  "prospects": [
    {{
      "name":         "Full Name",
      "title":        "Job Title",
      "company":      "Company Name",
      "linkedin_url": "https://linkedin.com/in/..."
    }}
  ]
}}
Be selective. Max 30 prospects. Include relevance score in your selection."""
        },
        {
            "role": "user",
            "content": (
                f"Search query: {query}\n"
                f"Product context: {product}\n\n"
                f"Raw LinkedIn results:\n{json.dumps(raw_urls, indent=2)}"
            )
        }
    ])

    candidate_prospects = parsed.get("prospects", [])[:30]
    print(f"[search_prospects] Extracted {len(candidate_prospects)} candidate prospects")

    return {
        **state,
        "candidate_prospects": candidate_prospects,
    }
