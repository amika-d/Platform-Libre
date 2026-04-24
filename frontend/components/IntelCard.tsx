'use client'

import { TrendingUp, TrendingDown, Minus, ExternalLink, Globe } from 'lucide-react'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'

interface Signal {
  label: string
  sentiment: 'positive' | 'negative' | 'neutral'
  detail: string
}

interface IntelCardProps {
  title: string
  summary: string
  signals: Signal[]
  sources?: number
  sourceDetails?: Array<{
    id: string
    domain: string
    url: string
  }>
  isStreaming?: boolean
}

export default function IntelCard({ title, summary, signals, sources, sourceDetails, isStreaming = false }: IntelCardProps) {
  const displayTitle = useTypingAnimation({ text: title, isActive: isStreaming })
  const displaySummary = useTypingAnimation({ text: summary, isActive: isStreaming })
  
  const sentimentIcon = {
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Minus,
  }
  const sentimentColor = {
    positive: '#111111',
    negative: '#444444',
    neutral: 'var(--text-muted)',
  }

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid var(--border-bright)',
        overflow: 'hidden',
        marginTop: 8,
        background: 'var(--bg-card)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--signal)' }} className="signal-dot" />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--signal)', letterSpacing: '0.06em' }}>
            MARKET INTELLIGENCE
          </span>
        </div>
        {sources && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {sources} sources scanned
          </span>
        )}
      </div>

      <div style={{ padding: '14px' }}>
        <p
          style={{
            fontSize: 13,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          {displayTitle}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
          {displaySummary}
        </p>

        {/* Signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {signals.map((signal, i) => {
            const Icon = sentimentIcon[signal.sentiment]
            const color = sentimentColor[signal.sentiment]
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <Icon size={12} color={color} strokeWidth={2} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, color: color, fontWeight: 600, marginBottom: 2 }}>{signal.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{signal.detail}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sources Section */}
        {sourceDetails && sourceDetails.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Sources
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sourceDetails.map((source, idx) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    border: '1px solid var(--border-bright)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    padding: '4px 10px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  className="source-tag"
                >
                  <span style={{ opacity: 0.5 }}>[{idx + 1}]</span>
                  <span>{source.domain}</span>
                  <ExternalLink size={10} style={{ opacity: 0.6 }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
