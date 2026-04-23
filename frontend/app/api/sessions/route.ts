import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_CANDIDATES = BACKEND_URL
  ? [BACKEND_URL]
  : ['http://localhost:8080', 'http://localhost:8000'];

async function proxyToBackend(path: string, init?: RequestInit): Promise<Response> {
  let lastError: string | null = null;

  for (const backendBaseUrl of BACKEND_CANDIDATES) {
    try {
      return await fetch(`${backendBaseUrl}${path}`, init);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Backend connection failed';
    }
  }

  throw new Error(lastError ?? 'Unable to reach backend');
}

export async function GET() {
  try {
    const response = await proxyToBackend('/v1/sessions');

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || 'Failed to fetch sessions' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach backend';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await proxyToBackend('/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || 'Failed to create session' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach backend';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
