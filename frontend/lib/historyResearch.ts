export interface HistoryResearchSource {
  id: string
  title: string
  url: string
  domain: string
  snippet: string
  published: string
  whyRelevant: string
}

export const HISTORY_RESEARCH_QUERY = 'What is the current positioning gap in the AI SDR market for Series B VP Sales teams?'

export const HISTORY_RESEARCH_SOURCES: HistoryResearchSource[] = [
  {
    id: 'src-g2-market-map',
    title: 'G2 Grid Report: Sales Engagement Platforms',
    url: 'https://www.g2.com/reports/sales-engagement-grid',
    domain: 'g2.com',
    snippet: 'Top vendors cluster around automation breadth and sequence volume, while personalization quality remains under-measured.',
    published: 'Updated Mar 2026',
    whyRelevant: 'Confirms category-level messaging is still volume first, creating room for quality-first positioning.',
  },
  {
    id: 'src-linkedin-buyer-signal',
    title: 'LinkedIn Buyer Pulse: Outbound Fatigue in Mid-Market Sales',
    url: 'https://www.linkedin.com/business/sales/blog/buyer-trends/outbound-fatigue',
    domain: 'linkedin.com',
    snippet: 'VP Sales respondents report higher reply rates when outreach references concrete trigger events over generic product claims.',
    published: 'Jan 2026',
    whyRelevant: 'Supports the signal-aware outreach angle and validates buyer preference for context-rich personalization.',
  },
  {
    id: 'src-revgenius-thread',
    title: 'RevGenius Discussion: Why AI SDR Emails Feel Robotic',
    url: 'https://www.revgenius.com/community/ai-sdr-discussion',
    domain: 'revgenius.com',
    snippet: 'Operators describe trust loss from templated AI copy and request stronger account context before first touch.',
    published: 'Feb 2026',
    whyRelevant: 'Provides direct practitioner language for positioning against robotic automation narratives.',
  },
  {
    id: 'src-cbinsights-pricing',
    title: 'CB Insights: Pricing Compression Across SDR Automation',
    url: 'https://www.cbinsights.com/research/report/sdr-automation-pricing',
    domain: 'cbinsights.com',
    snippet: 'New entrants are discounting aggressively on seats and sends, driving margin pressure in commodity automation tiers.',
    published: 'Dec 2025',
    whyRelevant: 'Indicates race-to-bottom risk and reinforces need to avoid pure price-based positioning.',
  },
]
