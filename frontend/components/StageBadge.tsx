'use client'

import { Globe, FileText, GitBranch, BarChart2, Zap, RefreshCw } from 'lucide-react'

export type Stage = 'research' | 'generate' | 'ab' | 'feedback' | 'refined' | 'idle'

const stageConfig: Record<Stage, { label: string; icon: any; color: string; bg: string; border: string }> = {
  research: {
    label: 'Market Intelligence',
    icon: Globe,
    color: '#111111',
    bg: 'rgba(0, 0, 0, 0.05)',
    border: 'rgba(0, 0, 0, 0.15)',
  },
  generate: {
    label: 'Content Generation',
    icon: FileText,
    color: '#222222',
    bg: 'rgba(0, 0, 0, 0.08)',
    border: 'rgba(0, 0, 0, 0.18)',
  },
  ab: {
    label: 'A/B Variants',
    icon: GitBranch,
    color: '#444444',
    bg: 'rgba(0, 0, 0, 0.11)',
    border: 'rgba(0, 0, 0, 0.22)',
  },
  feedback: {
    label: 'Feedback Loop',
    icon: BarChart2,
    color: '#555555',
    bg: 'rgba(0, 0, 0, 0.13)',
    border: 'rgba(0, 0, 0, 0.24)',
  },
  refined: {
    label: 'Refined Cycle',
    icon: RefreshCw,
    color: '#666666',
    bg: 'rgba(0, 0, 0, 0.16)',
    border: 'rgba(0, 0, 0, 0.26)',
  },
  idle: {
    label: 'Ready',
    icon: Zap,
    color: '#666666',
    bg: 'transparent',
    border: 'transparent',
  },
}

interface StageBadgeProps {
  stage: Stage
  pulse?: boolean
}

export default function StageBadge({ stage, pulse }: StageBadgeProps) {
  const config = stageConfig[stage]
  const Icon = config.icon

  if (stage === 'idle') return null

  return (
    <div
      className="stage-reveal"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px 3px 6px',
        borderRadius: 4,
        background: config.bg,
        border: `1px solid ${config.border}`,
        marginBottom: 12,
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {pulse && (
          <span
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              background: config.color,
              opacity: 0.3,
            }}
            className="signal-dot"
          />
        )}
        <Icon size={12} color={config.color} strokeWidth={2} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: config.color,
          letterSpacing: '0.04em',
          fontWeight: 500,
        }}
      >
        {config.label}
      </span>
    </div>
  )
}

export { stageConfig }
