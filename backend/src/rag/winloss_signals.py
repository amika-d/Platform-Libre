import httpx
from src.rag.signals import google_search, search_hn, search_reddit, _dedupe_results
import asyncio

async def search_conversion_blockers(query: str) -> list[dict]:
    tasks = [
        google_search(f'"{query}" complaints OR issues OR "not worth it"'),
        search_reddit(f'"{query}" pricing too expensive OR overpriced'),
        search_hn(f'"{query}" lacks feature OR "missing feature"')
    ]
    all_hits = await asyncio.gather(*tasks)
    results = all_hits[0] + all_hits[1] + all_hits[2]
    return _dedupe_results(results)

async def search_success_triggers(query: str) -> list[dict]:
    tasks = [
        google_search(f'"{query}" success stories OR review OR "best feature"'),
        search_reddit(f'"{query}" love OR "highly recommend"'),
        search_hn(f'"Show HN" {query} OR "{query}" changed my workflow')
    ]
    all_hits = await asyncio.gather(*tasks)
    results = all_hits[0] + all_hits[1] + all_hits[2]
    return _dedupe_results(results)

async def win_loss_search(query: str) -> list[dict]:
    tasks = [
        search_conversion_blockers(query),
        search_success_triggers(query)
    ]
    all_hits = await asyncio.gather(*tasks)
    return _dedupe_results(all_hits[0] + all_hits[1])
