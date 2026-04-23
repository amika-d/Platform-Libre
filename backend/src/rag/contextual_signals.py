from src.rag.signals import google_search, search_hn, _dedupe_results
import asyncio

async def search_events_and_conferences(query: str) -> list[dict]:
    tasks = [
        google_search(f'"{query}" conference 2026 OR event 2026'),
        google_search(f'"{query}" awareness day 2026 OR holiday schedule')
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1])

async def search_buying_cycles(query: str) -> list[dict]:
    tasks = [
        google_search(f'"{query}" budget cycle OR "procurement timeline"'),
        search_hn(f'how to sell "{query}" OR "buying process" {query}')
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1])

async def search_seasonal_trends(query: str) -> list[dict]:
    hits = await google_search(f'"{query}" seasonal trends OR "quarterly trends"')
    return _dedupe_results(hits)

async def search_market_disruptions(query: str) -> list[dict]:
    tasks = [
        google_search(f'"{query}" market disruption OR "new funding" OR "major announcement" 2026'),
        search_hn(f'"{query}" disruption OR "game changer"')
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1])

async def contextual_search(query: str) -> list[dict]:
    tasks = [
        search_events_and_conferences(query),
        search_buying_cycles(query),
        search_seasonal_trends(query),
        search_market_disruptions(query)
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1] + all_hits[2] + all_hits[3])
