"""
Signal collection for positioning analysis.
Focuses on contextual and temporal signals that influence campaign timing and messaging.
"""
from src.rag.signals import google_search, search_hn, search_reddit, _dedupe_results
import asyncio

async def search_contextual_temporal(query: str) -> list[dict]:
    """
    Gathers signals about seasons, buying cycles, events, disruptions, and timing.
    These signals help determine WHEN a message is most likely to be effective.
    """
    tasks = [
        google_search(f"{query} seasonal demand trends quarter buying cycle"),
        google_search(f"{query} major events launches conference calendar 2026"),
        google_search(f"{query} disruption outage regulation supply shock impact"),
        search_hn(f"{query} timing launch window market shift"),
        search_reddit(f"{query} best time to buy OR budget cycle OR renewal")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for h in all_hits: results += h
    
    return _dedupe_results(results)

async def positioning_search(query: str) -> list[dict]:
    """
    Gathers signals about messaging, value propositions, and how competitors talk.
    """
    tasks = [
        google_search(f'"{query}" messaging OR "value proposition"'),
        google_search(f'compare "{query}" alternatives'),
        search_hn(f'"{query}" vs'),
        search_reddit(f'"{query}" review OR "why we chose"')
    ]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for h in all_hits: results += h
    return _dedupe_results(results)
