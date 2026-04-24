'use client'

import { Copy, Trash2, FileText, BarChart2, Globe, GitBranch, ChevronRight } from 'lucide-react'

const stageIcon = {
  research: Globe,
  generate: FileText,
  ab: GitBranch,
  feedback: BarChart2,
}

const stageColor = {
  research: '#111111',
  generate: '#333333',
  ab: '#555555',
  feedback: '#777777',
}

export interface HistoryItem {
  id: string
  title: string
  subtitle: string
  stage: 'research' | 'generate' | 'ab' | 'feedback'
  timestamp: string
}

interface HistoryPanelProps {
  items: HistoryItem[]
}

export default function HistoryPanel({ items }: HistoryPanelProps) {
  return (
    <aside
      style={{
        width: 260,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Campaign History
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Search artifacts...</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {items.map((item, i) => {
          const Icon = stageIcon[item.stage]
          const color = stageColor[item.stage]
          return (
            <button
              key={item.id}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'block',
                marginBottom: 2,
                transition: 'background 0.15s',
              }}
              className="group"
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: `${color}18`,
                    border: `1px solid ${color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Icon size={13} color={color} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 2,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.subtitle}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {item.timestamp}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer credits */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Cycles used</p>
          <p style={{ fontSize: 12, color: 'var(--signal)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>14 / 50</p>
        </div>
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            background: 'var(--signal)',
            fontSize: 11,
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Upgrade
        </div>
      </div>
    </aside>
  )
}
