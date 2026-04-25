export interface AnalyseStreamRequest {
	query: string
	session_id: string
	use_mock?: boolean
}

export interface AnalyseStreamChunk {
	node?: string
	action?: string
	text?: string
	widget?: Record<string, unknown>
	asset?: Record<string, unknown>
	source?: string
	error?: string
	detail?: string
	done?: boolean
	status?: string
	type?: string // 'thinking', 'response', etc.
	thinking?: string // Added thinking explicitly
	domain?: string // research domain name (e.g., 'market', 'competitor')
	summary?: string // thinking/research summary
	opportunities?: string[] // research opportunities
	risks?: string[] // research risks
}

export interface LiveQueueItem {
	id: number
	campaign_id: string
	prospect_name?: string | null
	email: string
	company?: string | null
	channel?: string | null
	status: string
	variant_used?: string | null
	touch_number?: number | null
	created_at?: string | null
	sent_at?: string | null
	opened_at?: string | null
	replied_at?: string | null
	error_msg?: string | null
}

export interface LiveQueueStats {
	queued: number
	sent: number
	opened: number
	replied: number
	bounced: number
	error: number
	total: number
}

export interface LiveQueueResponse {
	session_id?: string | null
	items: LiveQueueItem[]
	stats: LiveQueueStats
}

export interface LaunchCampaignResponse {
	status: string
	message: string
	campaign_id?: string
	prospects_queued?: number
}

export interface ApproveProspectsPayload {
	thread_id: string
	approved?: boolean
	prospects?: string[]
}

export interface ApproveProspectsResponse {
	response?: string
	action?: string
	state?: {
		approved_count?: number
		pending_prospects?: number
		outreach_status?: unknown[]
	}
}

interface StreamHandlers {
	onChunk: (chunk: AnalyseStreamChunk) => void
	signal?: AbortSignal
}

const configuredBase = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '')
const fallbackBase = process.env.NEXT_PUBLIC_BACKEND_FALLBACK_URL?.replace(/\/$/, '')

const API_BASES = Array.from(new Set([configuredBase, 'http://localhost:8000', fallbackBase])).filter(
	(value): value is string => Boolean(value)
)

function isRecoverableChunkTermination(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error)
	const lower = message.toLowerCase()
	return (
		lower.includes('incomplete chunked encoding') ||
		lower.includes('err_incomplete_chunked_encoding') ||
		lower.includes('networkerror') ||
		lower.includes('failed to fetch')
	)
}

function parseSseFrame(frame: string): AnalyseStreamChunk[] {
	const dataLines: string[] = []
	const lines = frame.split(/\r?\n/)

	for (const rawLine of lines) {
		if (!rawLine.startsWith('data:')) continue
		dataLines.push(rawLine.slice(5).trim())
	}

	if (dataLines.length === 0) return []

	const data = dataLines.join('\n').trim()
	if (!data) return []

	if (data === '[DONE]') {
		return [{ done: true, status: 'complete' }]
	}

	try {
		return [JSON.parse(data) as AnalyseStreamChunk]
	} catch {
		return [{ text: data }]
	}
}

function findFrameBoundary(buffer: string): { index: number; separatorLength: number } | null {
	const lfBoundary = buffer.indexOf('\n\n')
	const crlfBoundary = buffer.indexOf('\r\n\r\n')

	if (lfBoundary === -1 && crlfBoundary === -1) return null
	if (lfBoundary === -1) return { index: crlfBoundary, separatorLength: 4 }
	if (crlfBoundary === -1) return { index: lfBoundary, separatorLength: 2 }

	return lfBoundary < crlfBoundary
		? { index: lfBoundary, separatorLength: 2 }
		: { index: crlfBoundary, separatorLength: 4 }
}

async function openAnalyseStream(
	baseUrl: string,
	payload: AnalyseStreamRequest,
	signal?: AbortSignal
): Promise<Response> {
	return fetch(`${baseUrl}/v1/analyse/stream`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
		signal,
	})
}

export async function streamAnalyse(
	payload: AnalyseStreamRequest,
	handlers: StreamHandlers
): Promise<void> {
	let lastError: unknown

	for (const baseUrl of API_BASES) {
		let receivedAnyChunk = false

		try {
			console.log(`[SSE] Attempting connection to ${baseUrl}...`)
			const response = await openAnalyseStream(baseUrl, payload, handlers.signal)

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(errorText || `Request failed (${response.status})`)
			}

			if (!response.body) {
				throw new Error('Streaming response body is missing.')
			}

			console.log(`[SSE] Connected to ${baseUrl}. Streaming started.`)

			const reader = response.body.getReader()
			const decoder = new TextDecoder()
			let buffer = ''

			while (true) {
				const { value, done } = await reader.read()
				if (done) {
					console.log('[SSE] Stream reading finished completely.')
					break
				}

				buffer += decoder.decode(value, { stream: true })

				let boundary = findFrameBoundary(buffer)
				while (boundary) {
					const frame = buffer.slice(0, boundary.index)
					buffer = buffer.slice(boundary.index + boundary.separatorLength)

					const chunks = parseSseFrame(frame)
					for (const chunk of chunks) {
						receivedAnyChunk = true
						console.log('[SSE] Parsed chunk:', chunk.node || chunk.status || chunk.error || 'unknown')
						handlers.onChunk(chunk)
					}

					boundary = findFrameBoundary(buffer)
				}
			}

			if (buffer.trim()) {
				const trailing = parseSseFrame(buffer)
				for (const chunk of trailing) {
					receivedAnyChunk = true
					console.log('[SSE] Parsed trailing chunk:', chunk.node || chunk.status || chunk.error || 'unknown')
					handlers.onChunk(chunk)
				}
			}

			return
		} catch (error) {
			if (handlers.signal?.aborted) {
				throw error
			}

			// Some browsers report an incomplete chunked encoding error even after valid SSE chunks.
			if (receivedAnyChunk && isRecoverableChunkTermination(error)) {
				console.warn('[SSE] Recoverable chunk termination error caught (stream closed early):', error)
				return
			}

			lastError = error
		}
	}

	throw lastError ?? new Error('Unable to connect to backend stream.')
}

export async function fetchLiveProspectQueue(sessionId?: string): Promise<LiveQueueResponse> {
	let lastError: unknown

	for (const baseUrl of API_BASES) {
		try {
			const url = new URL(`${baseUrl}/v1/outreach/queue`)
			if (sessionId) {
				url.searchParams.set('session_id', sessionId)
			}

			const response = await fetch(url.toString(), {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(errorText || `Request failed (${response.status})`)
			}

			const data = (await response.json()) as LiveQueueResponse
			return {
				session_id: data.session_id,
				items: Array.isArray(data.items) ? data.items : [],
				stats: data.stats ?? {
					queued: 0,
					sent: 0,
					opened: 0,
					replied: 0,
					bounced: 0,
					error: 0,
					total: 0,
				},
			}
		} catch (error) {
			lastError = error
		}
	}

	throw lastError ?? new Error('Unable to fetch live outreach queue.')
}

export async function launchCampaign(payload: {
	thread_id: string
	selected_variant: 'A' | 'B'
}): Promise<LaunchCampaignResponse> {
	let lastError: unknown

	for (const baseUrl of API_BASES) {
		try {
			const response = await fetch(`${baseUrl}/v1/outreach/launch`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			const contentType = response.headers.get('content-type') || ''

			if (!response.ok) {
				const bodyText = await response.text()
				const isJson = contentType.includes('application/json')

				if (isJson) {
					let parsedDetail = ''
					try {
						const parsed = JSON.parse(bodyText) as { detail?: string }
						parsedDetail = parsed.detail || ''
					} catch {
						// Fall through to plain-text fallback below.
					}

					if (parsedDetail) {
						throw new Error(parsedDetail)
					}

					throw new Error(`Request failed (${response.status}): ${bodyText || response.statusText}`)
				}

				// If HTML is returned, this likely hit the Next.js server instead of backend API.
				if (bodyText.trim().startsWith('<!DOCTYPE') || bodyText.trim().startsWith('<html')) {
					throw new Error(
						`Received HTML error page from ${baseUrl} (status ${response.status}). Verify frontend is calling backend on port 8000.`
					)
				}

				throw new Error(`Request failed (${response.status}): ${bodyText || response.statusText}`)
			}

			if (contentType.includes('application/json')) {
				return (await response.json()) as LaunchCampaignResponse
			}

			const text = await response.text()
			throw new Error(`Unexpected non-JSON success response: ${text.slice(0, 200)}`)
		} catch (error) {
			lastError = error
		}
	}

	throw lastError ?? new Error('Unable to launch outreach campaign.')
}

export async function approveProspects(payload: ApproveProspectsPayload): Promise<ApproveProspectsResponse> {
	let lastError: unknown

	for (const baseUrl of API_BASES) {
		try {
			const response = await fetch(`${baseUrl}/v1/analyse/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					thread_id: payload.thread_id,
					approved: payload.approved ?? true,
					prospects: payload.prospects ?? [],
				}),
			})

			if (!response.ok) {
				const bodyText = await response.text()
				throw new Error(bodyText || `Request failed (${response.status})`)
			}

			return (await response.json()) as ApproveProspectsResponse
		} catch (error) {
			lastError = error
		}
	}

	throw lastError ?? new Error('Unable to approve prospects.')
}
