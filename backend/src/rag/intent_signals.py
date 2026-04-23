"""
Signal collection for buyer intent analysis.
Focuses on identifying in-market signals, conversion triggers, friction points,
and capturing who is buying — in their own words.
"""
from src.rag.signals import google_search, search_hn, search_reddit, _dedupe_results, _firecrawl_from_results
import asyncio

async def search_intent(query: str) -> list[dict]:
    """
    Targeted search for conversion triggers, friction points, and buying questions.
    Captures in-market signals with verbatim buyer language.
    """
    tasks = [
        # ── TIER 1: Active buying signals ────────────────────────────────────────
        search_reddit(f'"{query}" "looking for" OR "evaluating" OR "trying to find" OR "need a tool" OR "recommendations"'),
        search_hn(f'"{query}" "ask hn" OR "recommend" OR "looking for" OR "alternatives"'),

        # ── TIER 2: Who is buying — job titles, team sizes, use cases ─────────────
        search_reddit(f'"{query}" "as a" OR "our team" OR "small business" OR "startup" OR "enterprise"'),
        google_search(f'"{query}" "we use" OR "our stack" OR "switched to" OR "moved to" site:reddit.com OR site:news.ycombinator.com'),

        # ── TIER 3: What they care about — priorities in their own words ──────────
        search_reddit(f'"{query}" "most important" OR "must have" OR "deal breaker" OR "wish it had" OR "missing feature"'),
        search_hn(f'"{query}" "the reason we" OR "what we really needed" OR "the thing that sold us"'),

        # ── TIER 4: Friction & deal-breakers (Why we lost) ───────────────────────
        search_reddit(f'"{query}" "too expensive" OR "hard to set up" OR "switched away" OR "cancelled" OR "churned"'),

        # ── TIER 5: Stickiness & "aha" moments (Why they stayed) ─────────────────
        search_hn(f'"{query}" "worth the money" OR "game changer" OR "killer feature" OR "can\'t live without"'),

        # ── TIER 6: Outreach friction (How they want to be sold to) ──────────────
        google_search(f'"{query}" "sales pitch" OR "cold outreach" "annoying" OR "helpful" OR "the way they sold"'),

        # ── TIER 7: Comparative & in-market questions ─────────────────────────────
        google_search(f'"{query}" vs "better for" 2026'),
        
        # ── TIER 8: Deep-scrape top comparison pages ──────────────────────────────
        google_search(f'"{query}" vs alternatives best', max_results=2)
    ]
    
    all_hits = await asyncio.gather(*tasks)
    
    results = []
    # all_hits[0] through all_hits[9] are standard hits
    for hits in all_hits[:-1]: 
        results += hits
        
    # all_hits[-1] is the TIER 8 comparison pages that we need to deep-scrape
    comparison_pages = all_hits[-1]
    
    scraped = await _firecrawl_from_results(comparison_pages, top_n=2)
    results += scraped

    return _dedupe_results(results)