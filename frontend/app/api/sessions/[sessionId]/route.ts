import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_CANDIDATES = BACKEND_URL
  ? [BACKEND_URL]
  : ['http://localhost:8080', 'http://localhost:8000'];

async function proxyToBackend(path: string): Promise<Response> {
  let lastError: string | null = null;

  for (const backendBaseUrl of BACKEND_CANDIDATES) {
    try {
      return await fetch(`${backendBaseUrl}${path}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Backend connection failed';
    }
  }

  throw new Error(lastError ?? 'Unable to reach backend');
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const response = await proxyToBackend(`/v1/sessions/${encodeURIComponent(sessionId)}`);

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || 'Failed to fetch session history' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach backend';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
