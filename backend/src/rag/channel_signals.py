import logging
from src.rag.signals import (
    _dedupe_results,
    _firecrawl_from_results,
    google_search,
    search_hn,
    search_reddit,
    scrape_page,
)
import asyncio

logger = logging.getLogger(__name__)
_FIRECRAWL_TOP_N = 2

async def search_channels(query: str) -> list[dict]:
    tasks = [
        google_search(f"{query} best converting marketing channels 2026"),
        google_search(f"{query} top marketing channels ROI benchmark report 2026"),
        google_search(f"{query} LinkedIn vs Twitter vs YouTube marketing performance"),
        search_reddit(f"{query} best marketing channel recommend"),
        search_reddit(f"{query} where to find customers online")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = all_hits[0] + all_hits[1] + all_hits[2] + all_hits[3] + all_hits[4]
    
    scraped = await _firecrawl_from_results(_dedupe_results(all_hits[0]), top_n=_FIRECRAWL_TOP_N)
    results += scraped
    return _dedupe_results(results)

async def search_campaign_performance(query: str) -> list[dict]:
    tasks = [
        google_search(f"{query} marketing case study results ROI 2025 OR 2026"),
        google_search(f"{query} ad creative performance CTR conversion rate benchmark"),
        google_search(f"{query} content marketing performance video blog podcast comparison"),
        google_search(f"{query} email campaign open rate click rate industry benchmark 2026"),
        search_hn(f"{query} launch feedback OR show hn"),
        search_hn(f"{query} marketing campaign results"),
        search_reddit(f"{query} marketing campaign what worked"),
        search_reddit(f"{query} ad performance tips")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for h in all_hits: results += h
    
    scraped = await _firecrawl_from_results(_dedupe_results(all_hits[0]), top_n=_FIRECRAWL_TOP_N)
    results += scraped
    return _dedupe_results(results)

async def search_resource_allocation(query: str) -> list[dict]:
    tasks = [
        google_search(f"{query} marketing budget allocation percentage 2026"),
        google_search(f"{query} customer acquisition cost by channel"),
        google_search(f"{query} marketing spend breakdown industry report 2025 OR 2026"),
        google_search(f"{query} LTV CAC ratio marketing efficiency benchmark"),
        search_reddit(f"{query} marketing budget allocation how much spend"),
        search_reddit(f"{query} customer acquisition cost channel comparison")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for h in all_hits: results += h
    
    scraped = await _firecrawl_from_results(_dedupe_results(all_hits[0]), top_n=_FIRECRAWL_TOP_N)
    results += scraped
    return _dedupe_results(results)