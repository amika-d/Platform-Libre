from src.rag.signals import _firecrawl_from_results, google_search, search_hn, _dedupe_results, search_reddit
import asyncio

async def search_audience_intent(query: str) -> list[dict]:
    """Finds real-world pain points and enriches them with full-page context."""
    tasks = [
        search_reddit(f"{query} problem OR sucks", max_results=5),
        search_reddit(f"{query} vs", max_results=3),
        google_search(f'"{query}" recommendation for 2026'),
        search_hn(f"{query} advice OR help")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = all_hits[0] + all_hits[1] + all_hits[2] + all_hits[3]
    all_raw_results = _dedupe_results(results)
    
    enriched_results = await _firecrawl_from_results(all_raw_results, top_n=3)
    return enriched_results

async def search_adjacent_markets(query: str) -> list[dict]:
    """Finds substitutes, adjacent tools, and encroaching competitors."""
    tasks = [
        search_reddit(f"{query} alternative OR instead OR switched from", max_results=5),
        google_search(f'"{query}" competitor OR alternative site:g2.com OR site:producthunt.com'),
        google_search(f'best {query} tools 2026')
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1] + all_hits[2])

async def search_macro_signals(query: str) -> list[dict]:
    """Finds regulatory, economic, and tech-shift signals affecting the domain."""
    tasks = [
        google_search(f'{query} regulation OR compliance OR policy 2025 2026'),
        google_search(f'{query} AI OR automation impact industry'),
        search_hn(f'{query} future OR trend OR disruption'),
        google_search(f'"{query}" layoffs OR budget cuts OR investment')
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1] + all_hits[2] + all_hits[3])

async def search_weak_signals(query: str) -> list[dict]:
    """Finds niche signals from communities and hiring trends."""
    tasks = [
        search_reddit(f"{query} (subreddit:sideprojects OR subreddit:entrepreneur OR subreddit:startups)", max_results=4),
        search_hn(f'Ask HN {query}', max_results=3),
        google_search(f'site:indiehackers.com {query}'),
        google_search(f'"{query}" job posting hiring site:linkedin.com OR site:lever.co 2026')
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1] + all_hits[2] + all_hits[3])

async def search_competitor_moves(query: str) -> list[dict]:
    """Tracks funding, product launches, and pivots in adjacent spaces."""
    tasks = [
        google_search(f'{query} startup funding raised 2025 2026 site:techcrunch.com OR site:crunchbase.com'),
        google_search(f'{query} product launch OR new feature 2026'),
        search_reddit(f"{query} just launched OR shipped OR released", max_results=4)
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1] + all_hits[2])