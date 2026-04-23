import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisDomain, AnalysisResult, ApiResponse, Citation } from '@/lib/types';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_CANDIDATES = BACKEND_URL
  ? [BACKEND_URL]
  : ['http://localhost:8080', 'http://localhost:8000'];

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeDomain(value: unknown): AnalysisDomain {
  if (!value || typeof value !== 'object') {
    return {
      findings: [],
      confidence: 0,
      key_insight: '',
    };
  }

  const domain = value as Partial<AnalysisDomain>;

  return {
    findings: normalizeStringArray(domain.findings),
    confidence: typeof domain.confidence === 'number' ? domain.confidence : 0,
    key_insight: typeof domain.key_insight === 'string' ? domain.key_insight : '',
  };
}

function hasDomainValue(domain: AnalysisDomain): boolean {
  return domain.confidence > 0
    || domain.key_insight.trim().length > 0
    || domain.findings.length > 0;
}

function normalizeCitation(citation: unknown, index: number): Citation {
  if (!citation || typeof citation !== 'object') {
    return { id: String(index + 1) };
  }

  const value = citation as Record<string, unknown>;

  return {
    id: typeof value.id === 'string' ? value.id : String(index + 1),
    documentName: typeof value.documentName === 'string' ? value.documentName : typeof value.doc === 'string' ? value.doc : undefined,
    page: typeof value.page === 'number' ? value.page : undefined,
    section: typeof value.section === 'string' ? value.section : undefined,
    relevanceScore: typeof value.relevanceScore === 'number' ? value.relevanceScore : typeof value.score === 'number' ? value.score : undefined,
    excerpt: typeof value.excerpt === 'string' ? value.excerpt : undefined,
    claim: typeof value.claim === 'string' ? value.claim : undefined,
    source: typeof value.source === 'string' ? value.source : undefined,
    url: typeof value.url === 'string' ? value.url : undefined,
  };
}

function buildAnalysisResponse(message: string, payload: Record<string, unknown>): AnalysisResult {
  const rawDomains = payload.domains && typeof payload.domains === 'object'
    ? (payload.domains as Record<string, unknown>)
    : {};

  const domains = Object.fromEntries(
    Object.entries(rawDomains).map(([key, value]) => [key, normalizeDomain(value)]),
  );

  const view = payload.view === 'full' ? 'full' : 'summary';
  const active_domains = normalizeStringArray(payload.active_domains);
  const visibleDomains = view === 'full'
    ? domains
    : Object.fromEntries(
      Object.entries(domains).filter(([key]) => active_domains.includes(key)),
    );

  const populatedDomains = Object.fromEntries(
    Object.entries(visibleDomains).filter(([, domain]) => hasDomainValue(domain)),
  );

  return {
    query: typeof payload.query === 'string' ? payload.query : message,
    summary: typeof payload.summary === 'string' ? payload.summary : '',
    top_opportunities: normalizeStringArray(payload.top_opportunities),
    top_risks: normalizeStringArray(payload.top_risks),
    recommended_actions: normalizeStringArray(payload.recommended_actions),
    low_confidence: normalizeStringArray(payload.low_confidence),
    urls: normalizeStringArray(payload.urls),
    view,
    active_domains,
    domains: populatedDomains,
    citations: Array.isArray(payload.citations)
      ? payload.citations.map((citation, index) => normalizeCitation(citation, index))
      : [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const startTime = Date.now();

    let backendRes: Response | null = null;
    let lastConnectionError = 'Backend request failed';

    for (const backendBaseUrl of BACKEND_CANDIDATES) {
      try {
        backendRes = await fetch(`${backendBaseUrl}/v1/analyse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: message,
            session_id: sessionId ?? 'default',
          }),
        });
        break;
      } catch (error) {
        lastConnectionError = error instanceof Error ? error.message : 'Backend connection failed';
      }
    }

    if (!backendRes) {
      return NextResponse.json(
        { error: `Unable to reach backend. ${lastConnectionError}` },
        { status: 502 },
      );
    }

    if (!backendRes.ok) {
      let errorMessage = 'Backend request failed';

      try {
        const errorPayload = await backendRes.json();
        if (typeof errorPayload?.detail === 'string') {
          errorMessage = errorPayload.detail;
        } else if (typeof errorPayload?.error === 'string') {
          errorMessage = errorPayload.error;
        }
      } catch {
        const fallbackText = await backendRes.text();
        if (fallbackText) {
          errorMessage = fallbackText;
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    const latency = Date.now() - startTime;
    const analysis = buildAnalysisResponse(message, data as Record<string, unknown>);

    const apiResponse: ApiResponse = {
      ...analysis,
      message: analysis.summary,
      usage: {
        completionTokens: 0,
        latency,
        tokensPerSecond: 0,
      },
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
