'use client'

import { useState } from 'react'

interface ClarifyOption {
  label: string
  value: string
}

interface ClarifyCardProps {
  question: string
  options: ClarifyOption[]
  onSelect?: (value: string) => void
}

export default function ClarifyCard({ question, options, onSelect }: ClarifyCardProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (value: string) => {
    setSelected(value)
    onSelect?.(value)
  }

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--border-bright)',
        padding: '12px 14px',
        marginTop: 8,
        background: 'var(--bg-elevated)',
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginBottom: 10,
          lineHeight: 1.5,
        }}
      >
        {question}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 5,
                border: isSelected
                  ? '1px solid var(--signal)'
                  : '1px solid var(--border-bright)',
                background: isSelected ? 'var(--signal-glow)' : 'var(--bg-card)',
                color: isSelected ? 'var(--signal)' : 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: isSelected ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
