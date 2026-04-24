'use client'

import { useState } from 'react'
import { Check, Copy, TrendingUp } from 'lucide-react'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'

interface Variant {
  label: string
  subject?: string
  hook: string
  cta: string
  angle: string
  score?: number
}

interface ABCardProps {
  variantA: Variant
  variantB: Variant
  onSelect?: (variant: 'A' | 'B') => void
  onDeploy?: (variant: 'A' | 'B') => void
  isStreaming?: boolean
}

export default function ABCard({ variantA, variantB, onSelect, onDeploy, isStreaming = false }: ABCardProps) {
  const [selected, setSelected] = useState<'A' | 'B' | null>(null)

  const handleSelect = (v: 'A' | 'B') => {
    setSelected(v)
    onSelect?.(v)
  }

  const displayVariantContent = (key: 'A' | 'B') => {
    const variant = key === 'A' ? variantA : variantB
    const displaySubject = useTypingAnimation({ text: variant.subject || '', isActive: isStreaming })
    const displayHook = useTypingAnimation({ text: variant.hook, isActive: isStreaming })

    return { displaySubject, displayHook }
  }

  const variantAContent = displayVariantContent('A')
  const variantBContent = displayVariantContent('B')

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
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-elevated)',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--signal)',
          }}
          className="signal-dot"
        />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--signal)', letterSpacing: '0.06em' }}>
          A/B VARIANT COMPARISON
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Select to deploy
        </span>
      </div>

      {/* Variants grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {(['A', 'B'] as const).map((key) => {
          const variant = key === 'A' ? variantA : variantB
          const content = key === 'A' ? variantAContent : variantBContent
          const isSelected = selected === key
          const color = key === 'A' ? '#111111' : '#555555'

          return (
            <div
              key={key}
              onClick={() => handleSelect(key)}
              style={{
                padding: '14px',
                borderRight: key === 'A' ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                background: isSelected ? `${color}10` : 'transparent',
                border: isSelected ? `1px solid ${color}40` : '1px solid transparent',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              {/* Variant label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: color,
                    fontWeight: 700,
                  }}
                >
                  {key}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {variant.angle}
                </span>
                {isSelected && (
                  <div style={{ marginLeft: 'auto' }}>
                    <Check size={12} color={color} />
                  </div>
                )}
              </div>

              {/* Subject */}
              {variant.subject && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3, letterSpacing: '0.08em' }}>
                    SUBJECT LINE
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                    {content.displaySubject}
                  </p>
                </div>
              )}

              {/* Hook */}
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3, letterSpacing: '0.08em' }}>
                  OPENING HOOK
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {content.displayHook}
                </p>
              </div>

              {/* CTA */}
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 5,
                  background: `${color}15`,
                  border: `1px solid ${color}25`,
                  display: 'inline-block',
                }}
              >
                <p style={{ fontSize: 11, color: color, fontWeight: 600 }}>→ {variant.cta}</p>
              </div>

              {/* Score */}
              {variant.score !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                  <TrendingUp size={11} color="var(--signal)" />
                  <span style={{ fontSize: 10, color: 'var(--signal)', fontFamily: 'var(--font-mono)' }}>
                    {variant.score}% predicted reply rate
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer action */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {selected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => onDeploy?.(selected)}
              style={{
                padding: '5px 14px',
                borderRadius: 5,
                border: 'none',
                background: 'var(--signal)',
                fontSize: 11,
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Deploy Variant {selected}
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              or type to refine
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Click a variant to select · or describe what to change
          </span>
        )}
      </div>
    </div>
  )
}
