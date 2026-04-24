'use client'

import { Copy, ShieldCheck, Sword, Target } from 'lucide-react'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'

interface BattleCardProps {
  usLabel: string
  themLabel: string
  usPoints: string[]
  themPoints: string[]
  gapStatement: string
  keyDifferentiator: string
  signalReference?: string
  onCopy?: () => void
  isStreaming?: boolean
}

function PointList({ title, points, tone }: { title: string; points: string[]; tone: 'positive' | 'neutral' }) {
  const borderColor = tone === 'positive' ? 'var(--signal)' : 'var(--border-bright)'
  const badgeBg = tone === 'positive' ? 'rgba(0, 0, 0, 0.08)' : 'var(--bg-elevated)'

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        background: 'var(--bg-elevated)',
        padding: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            color: 'var(--text-primary)',
            background: badgeBg,
            border: '1px solid var(--border)',
            borderRadius: 999,
            padding: '3px 8px',
          }}
        >
          {title}
        </span>
      </div>

      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {points.map((point, index) => (
          <li key={`${title}-${index}`} style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function BattleCard({
  usLabel,
  themLabel,
  usPoints,
  themPoints,
  gapStatement,
  keyDifferentiator,
  signalReference,
  onCopy,
  isStreaming = false,
}: BattleCardProps) {
  const displayGapStatement = useTypingAnimation({ text: gapStatement, isActive: isStreaming })
  const displayKeyDifferentiator = useTypingAnimation({ text: keyDifferentiator, isActive: isStreaming })

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
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-elevated)',
        }}
      >
        <Sword size={13} color="var(--signal)" />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--signal)', letterSpacing: '0.06em' }}>
          BATTLE CARD
        </span>
        {signalReference ? (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Research-backed
          </span>
        ) : null}
      </div>

      <div style={{ padding: 14 }}>
        <div
          style={{
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Target size={13} color="var(--text-primary)" />
            <p style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              POSITIONING GAP
            </p>
          </div>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>{displayGapStatement}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <PointList title={usLabel} points={usPoints} tone="positive" />
          <PointList title={themLabel} points={themPoints} tone="neutral" />
        </div>

        <div
          style={{
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ShieldCheck size={13} color="var(--signal)" />
            <p style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--signal)', letterSpacing: '0.06em' }}>
              KEY DIFFERENTIATOR
            </p>
          </div>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>{displayKeyDifferentiator}</p>
        </div>

        {(signalReference || onCopy) && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'space-between',
            }}
          >
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {signalReference || ''}
            </p>

            {onCopy && (
              <button
                type="button"
                onClick={onCopy}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  borderRadius: 6,
                  padding: '6px 9px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                }}
              >
                <Copy size={12} />
                Copy
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
