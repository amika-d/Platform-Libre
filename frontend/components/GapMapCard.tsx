'use client'

import { ScatterChart } from '@mui/x-charts/ScatterChart'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'

interface CompetitorPoint {
  name: string
  x: number
  y: number
}

interface GapZone {
  id: string
  label: string
  x: number
  y: number
  description: string
}

interface GapMapCardProps {
  title: string
  xLabel: string
  yLabel: string
  competitors: CompetitorPoint[]
  gaps: GapZone[]
  selectedGapId?: string | null
  onSelectGap: (gap: GapZone) => void
  isStreaming?: boolean
}

export default function GapMapCard({
  title,
  xLabel,
  yLabel,
  competitors,
  gaps,
  selectedGapId,
  onSelectGap,
  isStreaming = false,
}: GapMapCardProps) {
  const displayTitle = useTypingAnimation({ text: title, isActive: isStreaming })
  
  const competitorSeries = {
    label: 'Competitors',
    data: competitors.map((point, index) => ({ x: point.x, y: point.y, id: `competitor-${index}` })),
  }

  const gapSeries = {
    label: 'Messaging Gaps',
    data: gaps.map((gap, index) => ({ x: gap.x, y: gap.y, id: `gap-${index}` })),
  }

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid var(--border-bright)',
        background: 'var(--bg-card)',
        marginTop: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', color: 'var(--signal)' }}>
          COMPETITIVE INTELLIGENCE GAP MAP
        </p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Click a messaging gap to generate outreach
        </p>
      </div>

      <div style={{ padding: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-display)' }}>
          {displayTitle}
        </p>

        <div
          style={{
            position: 'relative',
            height: 300,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.005) 100%)',
            overflow: 'hidden',
          }}
        >
          <ScatterChart
            height={300}
            xAxis={[{ min: 0, max: 100, label: xLabel }]}
            yAxis={[{ min: 0, max: 100, label: yLabel }]}
            series={[competitorSeries, gapSeries]}
            margin={{ left: 44, right: 20, top: 16, bottom: 32 }}
            grid={{ vertical: true, horizontal: true }}
          />

          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {competitors.map(point => (
              <span
                key={point.name}
                style={{
                  position: 'absolute',
                  left: `calc(${(point.x / 100) * 93 + 3.5}% - 35px)`,
                  bottom: `calc(${(point.y / 100) * 90 + 3.5}% + 8px)`,
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  background: 'rgba(255, 255, 255, 0.92)',
                  padding: '4px 8px',
                  borderRadius: 5,
                  border: '1px solid var(--border-bright)',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  zIndex: 10,
                }}
              >
                {point.name}
              </span>
            ))}

            {gaps.map(gap => {
              const isSelected = selectedGapId === gap.id
              return (
                <button
                  key={gap.id}
                  onClick={() => onSelectGap(gap)}
                  title={gap.description}
                  style={{
                    pointerEvents: 'auto',
                    position: 'absolute',
                    left: `calc(${(gap.x / 100) * 93 + 3.5}% - 50px)`,
                    bottom: `calc(${(gap.y / 100) * 90 + 3.5}% - 24px)`,
                    width: 100,
                    minHeight: 40,
                    borderRadius: 7,
                    border: isSelected ? '2px solid var(--signal)' : '2px dashed var(--border-bright)',
                    background: isSelected ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 255, 255, 0.85)',
                    color: isSelected ? 'var(--signal)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 8px',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-sans)',
                    boxShadow: isSelected ? '0 2px 8px rgba(0, 255, 136, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {gap.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
