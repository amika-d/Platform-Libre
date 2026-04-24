'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AnalyseStreamChunk } from '@/lib/api'

interface ThinkingBlockProps {
	chunk: AnalyseStreamChunk
	isStreaming?: boolean
}

function normalizeText(value: unknown): string {
	if (typeof value === 'string') return value
	if (value === null || value === undefined) return ''
	if (Array.isArray(value)) return value.map(item => normalizeText(item)).filter(Boolean).join(' ')
	if (typeof value === 'object') return JSON.stringify(value)
	return String(value)
}

function normalizeList(value: unknown): string[] {
	if (!value) return []
	if (Array.isArray(value)) {
		return value
			.map(item => normalizeText(item))
			.map(item => item.trim())
			.filter(Boolean)
	}
	const single = normalizeText(value).trim()
	return single ? [single] : []
}

const domainLabels: Record<string, { label: string }> = {
	market: { label: 'Market Research' },
	competitor: { label: 'Competitor Analysis' },
	channel: { label: 'Channel Analysis' },
	intent: { label: 'Intent Research' },
	adjacent: { label: 'Adjacent Markets' },
	contextual: { label: 'Context Analysis' },
	positioning: { label: 'Positioning Strategy' },
	win_loss: { label: 'Win/Loss Analysis' },
	synthesis: { label: 'Research Synthesis' },
}

export function ThinkingBlock({ chunk, isStreaming }: ThinkingBlockProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	if (chunk.type !== 'thinking') return null

	const domain = chunk.domain || 'unknown'
	const info = domainLabels[domain] || { label: domain }
	const opportunities = normalizeList(chunk.opportunities)
	const risks = normalizeList(chunk.risks)
	const summary = normalizeText(chunk.summary).trim()
	const hasContent = Boolean(summary) || opportunities.length > 0 || risks.length > 0

	if (!hasContent) return null

	return (
		<div className="mb-4 rounded-lg border border-gray-200 overflow-hidden">
			{/* Header - Always Visible */}
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 transition-colors"
			>
				<div className="text-left">
					<div className="text-sm font-semibold text-gray-700">{info.label}</div>
					{isStreaming && <div className="text-xs text-gray-500">Analyzing...</div>}
				</div>
				<ChevronDown
					size={18}
					className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
				/>
			</button>

			{/* Expandable Content */}
			{isExpanded && (
				<div className="border-t border-gray-200 px-4 py-3 bg-white/50 text-sm space-y-4">
					{summary && (
						<div>
							<h4 className="font-semibold text-gray-700 mb-2">Summary</h4>
							<p className="text-gray-600 leading-relaxed">{summary}</p>
						</div>
					)}

					{opportunities.length > 0 && (
						<div>
							<h4 className="font-semibold text-gray-700 mb-2">Key Opportunities</h4>
							<ul className="space-y-1">
								{opportunities.map((opp, idx) => (
									<li key={idx} className="text-gray-600 flex gap-2">
										<span className="font-bold">-</span>
										<span>{opp}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{risks.length > 0 && (
						<div>
							<h4 className="font-semibold text-gray-700 mb-2">Key Risks</h4>
							<ul className="space-y-1">
								{risks.map((risk, idx) => (
									<li key={idx} className="text-gray-600 flex gap-2">
										<span className="font-bold">-</span>
										<span>{risk}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
