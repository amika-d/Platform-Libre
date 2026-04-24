'use client'

import { FileText } from 'lucide-react'
import {
  Legend,
  RadialBar,
  RadialBarChart,
  Tooltip,
} from 'recharts'
import { RechartsDevtools } from '@recharts/devtools'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'

interface ChannelBubble {
  id: string
  label: string
  replyRate: number
  x: number
  y: number
  color: string
}

interface ReachMapCardProps {
  title: string
  channels: ChannelBubble[]
  contentChannelId: string
  onMoveContent: (fromChannelId: string, toChannelId: string) => void
  isStreaming?: boolean
}

function bubbleSize(rate: number, minRate: number, maxRate: number): number {
  if (maxRate === minRate) return 96
  const normalized = (rate - minRate) / (maxRate - minRate)
  return 62 + normalized * 78
}

export default function ReachMapCard({
  title,
  channels,
  contentChannelId,
  onMoveContent,
  isStreaming = false,
}: ReachMapCardProps) {
  const displayTitle = useTypingAnimation({ text: title, isActive: isStreaming })
  const chartData = channels.map(channel => ({
    id: channel.id,
    label: channel.label,
    replyRate: channel.replyRate,
    fill: channel.color,
  }))

  const renderLegend = (props: any) => {
    const payload = (props.payload ?? []) as any[]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
        {payload.map((entry, index) => {
          const channel = entry.payload
          if (!channel) return null

          const hasContent = contentChannelId === channel.id

          return (
            <div
              key={`${channel.id}-${index}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const from = e.dataTransfer.getData('text/channel')
                if (from && from !== channel.id) {
                  onMoveContent(from, channel.id)
                }
              }}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '7px 8px',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: channel.fill,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.2 }}>
                    {channel.label}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 1.3 }}>
                    {channel.replyRate}% reply rate
                  </p>
                </div>
              </div>

              {hasContent && (
                <div
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/channel', channel.id)
                  }}
                  style={{
                    padding: '2px 7px',
                    borderRadius: 999,
                    border: '1px solid var(--border-bright)',
                    background: 'var(--bg-elevated)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'grab',
                    flexShrink: 0,
                  }}
                  title="Drag to another channel"
                >
                  <FileText size={10} color="var(--text-secondary)" />
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Content
                  </span>
                </div>
              )}
            </div>
          )
        })}
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
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--signal)', letterSpacing: '0.06em' }}>
          CHANNEL PERFORMANCE REACH MAP
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Drag Content from weak to strong channel
        </span>
      </div>

      <div style={{ padding: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 10 }}>
          {displayTitle}
        </p>

        <div
          style={{
            width: '100%',
            maxWidth: 700,
            height: 300,
            margin: '0 auto',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background:
              'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.04), transparent 45%), radial-gradient(circle at 78% 40%, rgba(0,0,0,0.03), transparent 48%), linear-gradient(180deg, rgba(0,0,0,0.015), rgba(0,0,0,0.003))',
            padding: 8,
          }}
        >
          <RadialBarChart
            data={chartData}
            innerRadius="14%"
            outerRadius="92%"
            cx="36%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            barSize={18}
            responsive
            style={{ width: '100%', height: '100%', maxWidth: '700px', maxHeight: '80vh', aspectRatio: '1.618' }}
          >
            <RadialBar
              dataKey="replyRate"
              background
              label={{ position: 'insideStart', fill: '#ffffff', fontSize: 10 }}
            />
            <Tooltip
              formatter={(value: any, _name: any, item: any) => [`${value}% reply rate`, item?.payload?.label ?? 'Channel']}
              contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 11 }}
            />
            <Legend
              iconSize={10}
              layout="vertical"
              verticalAlign="middle"
              align="right"
              content={renderLegend as any}
            />
            <RechartsDevtools />
          </RadialBarChart>
        </div>
      </div>
    </div>
  )
}
