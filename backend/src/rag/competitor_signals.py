import logging
import asyncio
from src.rag.signals import (
    _dedupe_results,
    _firecrawl_from_results,
    google_search,
    search_hn,
    search_reddit,
    scrape_page,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_FIRECRAWL_TOP_N = 2  # Deep-scrape top N URLs per tier; raise for richer evidence

# ---------------------------------------------------------------------------
# Tier functions
# ---------------------------------------------------------------------------

async def _tier1_self_image(query: str) -> list[dict]:
    """What competitors say about themselves — homepage copy, mission, value prop."""
    tasks = [
        google_search(f'"{query}" value proposition OR "why choose us" OR "our mission" 2025 OR 2026', max_results=4),
        google_search(f"{query} features pricing official site", max_results=3)
    ]
    all_hits = await asyncio.gather(*tasks)
    results = all_hits[0] + all_hits[1]
    
    # Deep-scrape the top positioning pages
    scraped = await _firecrawl_from_results(_dedupe_results(all_hits[0]), top_n=_FIRECRAWL_TOP_N)
    results += scraped
    return results


async def _tier2_market_image(query: str) -> list[dict]:
    """How the market compares competitors — alternatives, switching intent."""
    tasks = [
        google_search(f"best alternatives to {query} cons OR limitations OR problems 2025 OR 2026", max_results=4),
        google_search(f"{query} vs competitors comparison 2025 OR 2026", max_results=3),
        search_reddit(f"{query} alternatives switching from"),
        search_reddit(f"{query} vs which is better")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = all_hits[0] + all_hits[1] + all_hits[2] + all_hits[3]
    
    # Deep-scrape top comparison pages
    scraped = await _firecrawl_from_results(_dedupe_results(all_hits[0]), top_n=_FIRECRAWL_TOP_N)
    results += scraped
    return results


async def _tier3_unmet_needs(query: str) -> list[dict]:
    """Raw, unfiltered customer pain points — the gaps competitors are NOT filling."""
    tasks = [
        search_reddit(f"{query} wish it had OR doesn't support OR missing feature"),
        search_reddit(f"{query} problem frustrating limitation workaround"),
        search_reddit(f"{query} review honest opinion after using"),
        search_hn(f"{query} limitations problems"),
        search_hn(f"{query} show hn feedback OR ask hn"),
        google_search(f'site:reddit.com "{query}" "wish it had" OR "doesn\'t support" OR "can\'t do"', max_results=4)
    ]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for h in all_hits:
        results += h
    return results


async def _tier4_social_proof(query: str) -> list[dict]:
    """Review-site sentiment, star ratings, and recurring praise/complaint patterns."""
    tasks = [
        google_search(f"{query} reviews site:g2.com OR site:capterra.com OR site:trustradius.com", max_results=4),
        google_search(f"{query} customer reviews pros cons 2025 OR 2026", max_results=3),
        search_reddit(f"{query} review worth it recommend")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = all_hits[0] + all_hits[1] + all_hits[2]
    
    # Deep-scrape top review pages for detailed sentiment
    scraped = await _firecrawl_from_results(_dedupe_results(all_hits[0]), top_n=_FIRECRAWL_TOP_N)
    results += scraped
    return results


async def _tier5_pricing_gtm(query: str) -> list[dict]:
    """Pricing pages, go-to-market tactics, launch signals, and growth strategies."""
    tasks = [
        google_search(f"{query} pricing plans tiers cost per month 2025 OR 2026", max_results=4),
        search_hn(f"{query} launch pricing growth"),
        search_hn(f"{query} how we grew OR acquisition strategy"),
        google_search(f"{query} go to market strategy customer acquisition growth 2025 OR 2026", max_results=3),
        search_reddit(f"{query} pricing too expensive worth the cost")
    ]
    all_hits = await asyncio.gather(*tasks)
    results = []
    for h in all_hits:
        results += h
        
    # Deep-scrape pricing pages for exact tier data
    scraped = await _firecrawl_from_results(_dedupe_results(all_hits[0]), top_n=_FIRECRAWL_TOP_N)
    results += scraped
    return results