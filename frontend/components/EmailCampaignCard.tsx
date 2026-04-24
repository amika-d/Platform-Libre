'use client'

import { useState } from 'react'
import { Check, Loader, AlertCircle } from 'lucide-react'

interface EmailVariant {
  id?: string
  angle?: string
  hypothesis?: string
  signal_reference?: string
  touch_1?: { subject?: string; body?: string; cta?: string }
  touch_2?: { subject?: string; body?: string; cta?: string }
  touch_3?: { subject?: string; body?: string; cta?: string }
}

interface EmailCampaignCardProps {
  variantA: EmailVariant
  variantB: EmailVariant
  onDeploy?: (variant: 'A' | 'B') => Promise<void>
  isDeploying?: boolean
  deployError?: string | null
}

export default function EmailCampaignCard({
  variantA,
  variantB,
  onDeploy,
  isDeploying = false,
  deployError = null,
}: EmailCampaignCardProps) {
  const [selected, setSelected] = useState<'A' | 'B' | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSelect = (v: 'A' | 'B') => {
    setSelected(v)
    setLocalError(null)
  }

  const handleDeploy = async (v: 'A' | 'B') => {
    try {
      setLocalError(null)
      await onDeploy?.(v)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deploy failed'
      setLocalError(message)
    }
  }

  const renderVariantContent = (variant: EmailVariant, label: 'A' | 'B') => {
    const touch1 = variant.touch_1 || {}
    const color = label === 'A' ? '#111111' : '#555555'

    return (
      <div
        style={{
          padding: '16px',
          borderRight: label === 'A' ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
          background: selected === label ? `${color}08` : 'transparent',
          border: selected === label ? `1px solid ${color}30` : '1px solid transparent',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
        onClick={() => handleSelect(label)}
      >
        {/* Variant label with angle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: `${color}20`,
              border: `1.5px solid ${color}50`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: color,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {label}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 2 }}>
              {variant.angle || variant.hypothesis || 'Variant'}
            </p>
            {variant.signal_reference && (
              <p style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.3, opacity: 0.8, fontStyle: 'italic' }}>
                {variant.signal_reference}
              </p>
            )}
          </div>
          {selected === label && (
            <Check size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
          )}
        </div>

        {/* Subject Line */}
        {touch1.subject && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Subject
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
              {touch1.subject}
            </p>
          </div>
        )}

        {/* Opening Hook */}
        {touch1.body && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Opening Hook
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: '160px', overflow: 'hidden' }}>
              {touch1.body.substring(0, 280)}
              {touch1.body.length > 280 ? '…' : ''}
            </p>
          </div>
        )}

        {/* CTA */}
        {touch1.cta && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 5,
              background: `${color}12`,
              border: `1px solid ${color}25`,
              display: 'inline-block',
            }}
          >
            <p style={{ fontSize: 11, color: color, fontWeight: 600 }}>
              → {touch1.cta}
            </p>
          </div>
        )}
      </div>
    )
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
          padding: '12px 16px',
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
        />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--signal)', letterSpacing: '0.06em', fontWeight: 600 }}>
          A/B VARIANT COMPARISON
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Select to deploy
        </span>
      </div>

      {/* Error message */}
      {(deployError || localError) && (
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.05)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#ef4444" />
          <p style={{ fontSize: 11, color: '#ef4444' }}>
            {deployError || localError}
          </p>
        </div>
      )}

      {/* Variants grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {renderVariantContent(variantA, 'A')}
        {renderVariantContent(variantB, 'B')}
      </div>

      {/* Footer with deploy button */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          background: 'var(--bg-elevated)',
        }}
      >
        {selected ? (
          <button
            type="button"
            onClick={() => handleDeploy(selected)}
            disabled={isDeploying}
            style={{
              padding: '6px 16px',
              borderRadius: 5,
              border: 'none',
              background: isDeploying ? 'var(--text-muted)' : 'var(--signal)',
              fontSize: 11,
              fontWeight: 600,
              color: '#ffffff',
              cursor: isDeploying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-sans)',
              opacity: isDeploying ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {isDeploying && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            Deploy Variant {selected}
          </button>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Click a variant to select
          </span>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
