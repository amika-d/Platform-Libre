# src/agents/outreach/__init__.py
"""
Outreach management module for discovering and engaging prospects.

Workflow:
  1. search_prospects_node    → Search LinkedIn using Tavily + user query
  2. show_prospects_node      → Display found candidates to user
  3. approve_prospects_node   → Get human approval, initialize outreach tracking
"""

from src.agents.outreach.search_prospects import search_prospects_node
from src.agents.outreach.approve_outreach import (
    show_prospects_node,
    approve_prospects_node,
    get_discovery_summary,
)

# Deprecated: Use new workflow above
from src.agents.outreach.find_prospects import find_prospects_node

__all__ = [
    "search_prospects_node",
    "show_prospects_node",
    "approve_prospects_node",
    "get_discovery_summary",
    "find_prospects_node",  # deprecated
]
