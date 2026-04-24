'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchLiveProspectQueue, type LiveQueueItem } from '@/lib/api'

type Channel = 'Email' | 'LinkedIn'
type Status = 'ready' | 'sending' | 'paused'
type FilterType = 'all' | 'email' | 'linkedin' | 'sending' | 'paused'

interface SignalType {
  label: string
  bg: string
  color: string
}

interface AvatarStyle {
  bg: string
  color: string
}

interface Prospect {
  id: number
  name: string
  company: string
  role: string
  initials: string
  channel: Channel
  signalIndex: number
  status: Status
  initialDelay: number
}

const AVATAR_COLORS: AvatarStyle[] = [
  { bg: '#E6F1FB', color: '#0C447C' },
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#FAECE7', color: '#712B13' },
  { bg: '#EAF3DE', color: '#27500A' },
  { bg: '#FBEAF0', color: '#72243E' },
  { bg: '#F1EFE8', color: '#444441' },
]

const SIGNAL_TYPES: SignalType[] = [
  { label: 'job change',        bg: '#EEEDFE', color: '#3C3489' },
  { label: 'funding round',     bg: '#EAF3DE', color: '#27500A' },
  { label: 'viewed profile',    bg: '#E6F1FB', color: '#0C447C' },
  { label: 'competitor switch', bg: '#FAECE7', color: '#712B13' },
  { label: 'hiring SDRs',       bg: '#FAEEDA', color: '#633806' },
  { label: 'product launch',    bg: '#E1F5EE', color: '#085041' },
]

const CHANNEL_STYLES: Record<Channel, { bg: string; color: string }> = {
  Email:    { bg: '#FAEEDA', color: '#633806' },
  LinkedIn: { bg: '#E6F1FB', color: '#0C447C' },
}

function fmtTime(seconds: number): string {
  if (seconds <= 0) return 'now'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All',         value: 'all'      },
  { label: 'Email',       value: 'email'    },
  { label: 'LinkedIn',    value: 'linkedin' },
  { label: 'Sending now', value: 'sending'  },
  { label: 'Paused',      value: 'paused'   },
]

export default function LiveProspectQueue({ sessionId }: { sessionId?: string }) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [timers, setTimers] = useState<Record<number, number>>(() => {
    return {}
  })
  const [filter, setFilter] = useState<FilterType>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ sentToday: 0, totalQueued: 0, replyRate: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const mapStatus = (status: string): Status => {
    const lower = (status || '').toLowerCase()
    if (lower === 'queued') return 'ready'
    if (lower === 'sent' || lower === 'opened') return 'sending'
    return 'paused'
  }

  const computeInitialDelay = (item: LiveQueueItem): number => {
    const createdAt = item.created_at ? new Date(item.created_at).getTime() : Date.now()
    const target = createdAt + 15 * 60 * 1000
    const leftMs = target - Date.now()
    return Math.max(0, Math.floor(leftMs / 1000))
  }

  const mapItemToProspect = (item: LiveQueueItem): Prospect => {
    const channel = (item.channel || 'email').toLowerCase() === 'linkedin' ? 'LinkedIn' : 'Email'
    const name = (item.prospect_name || item.email || 'Prospect').trim()
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'P'

    return {
      id: item.id,
      name,
      company: (item.company || 'Unknown company').trim(),
      role: item.variant_used ? `Variant ${item.variant_used} · Touch ${item.touch_number ?? 1}` : `Touch ${item.touch_number ?? 1}`,
      initials,
      channel,
      signalIndex: item.id % SIGNAL_TYPES.length,
      status: mapStatus(item.status),
      initialDelay: computeInitialDelay(item),
    }
  }

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetchLiveProspectQueue(sessionId)
      const mapped = response.items.map(mapItemToProspect)
      setProspects(mapped)

      setTimers(prev => {
        const next: Record<number, number> = {}
        mapped.forEach(p => {
          if (p.status === 'ready') {
            next[p.id] = prev[p.id] ?? p.initialDelay
          }
        })
        return next
      })

      const sent = (response.stats.sent || 0) + (response.stats.opened || 0)
      const replied = response.stats.replied || 0
      const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0
      setStats({
        sentToday: sent,
        totalQueued: response.stats.total || mapped.length,
        replyRate,
      })
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load live queue'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    setIsLoading(true)
    void loadQueue()

    const poll = setInterval(() => {
      void loadQueue()
    }, 5000)

    return () => clearInterval(poll)
  }, [loadQueue])

  // Single stable interval — reads latest state via functional updaters
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(key => {
          const id = Number(key)
          if (next[id] > 0) next[id]--
        })
        // Flip any ready prospects whose timer just hit 0
        setProspects(pp =>
          pp.map(p =>
            p.status === 'ready' && next[p.id] === 0
              ? { ...p, status: 'sending' }
              : p
          )
        )
        return next
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, []) // empty deps — runs once, never resets

  const togglePause = useCallback((id: number) => {
    setProspects(prev =>
      prev.map(p => {
        if (p.id !== id) return p
        if (p.status === 'ready')  return { ...p, status: 'paused' }
        if (p.status === 'paused') return { ...p, status: 'ready' }
        return p
      })
    )
    setTimers(prev => ({ ...prev, [id]: prev[id] ?? 300 }))
  }, [])

  const skipProspect = useCallback((id: number) => {
    setProspects(prev => prev.filter(p => p.id !== id))
    setTimers(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const filtered = prospects.filter(p => {
    if (filter === 'all')      return true
    if (filter === 'email')    return p.channel === 'Email'
    if (filter === 'linkedin') return p.channel === 'LinkedIn'
    if (filter === 'sending')  return p.status === 'sending'
    if (filter === 'paused')   return p.status === 'paused'
    return true
  })

  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border-bright)', overflow: 'hidden', background: 'var(--bg-card)', marginTop: 8 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <LiveDot />
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#000000', letterSpacing: '0.05em', flex: 1 }}>
          LIVE PROSPECT QUEUE
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {stats.totalQueued || prospects.length} queued
        </span>
      </div>

      {(isLoading || error) && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, color: error ? '#9d3124' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {error ? `Live queue unavailable: ${error}` : 'Loading live queue...'}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, padding: '9px 16px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              border: filter === f.value ? '1px solid var(--signal-dim)' : '1px solid var(--border-bright)',
              background: filter === f.value ? 'var(--signal-glow)' : 'transparent',
              color: filter === f.value ? 'var(--signal)' : 'var(--text-muted)',
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            No prospects match this filter
          </div>
        )}
        {filtered.map((p, i) => (
          <ProspectRow
            key={p.id}
            prospect={p}
            avatarStyle={AVATAR_COLORS[p.id % AVATAR_COLORS.length]}
            signal={SIGNAL_TYPES[p.signalIndex]}
            channelStyle={CHANNEL_STYLES[p.channel]}
            timeLeft={timers[p.id] ?? 0}
            isLast={i === filtered.length - 1}
            onTogglePause={togglePause}
            onSkip={skipProspect}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <FooterStat label="Sent today" value={`${stats.sentToday}`} />
          <FooterStat label="Daily limit" value={`${stats.totalQueued || prospects.length}`} />
          <FooterStat label="Reply rate" value={`${stats.replyRate}%`} />
        </div>
        <button style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-bright)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          + Add prospects
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────

function LiveDot() {
  return (
    <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
      <style>{`@keyframes lpq-pulse{0%,100%{transform:scale(1);opacity:.35}50%{transform:scale(1.9);opacity:0}}`}</style>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#000000', opacity: 0.35, animation: 'lpq-pulse 1.8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: '#000000' }} />
    </div>
  )
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label} </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  )
}

interface ProspectRowProps {
  prospect: Prospect
  avatarStyle: AvatarStyle
  signal: SignalType
  channelStyle: { bg: string; color: string }
  timeLeft: number
  isLast: boolean
  onTogglePause: (id: number) => void
  onSkip: (id: number) => void
}

function ProspectRow({ prospect, avatarStyle, signal, channelStyle, timeLeft, isLast, onTogglePause, onSkip }: ProspectRowProps) {
  const [hovered, setHovered] = useState(false)
  const isSending = prospect.status === 'sending'
  const isPaused  = prospect.status === 'paused'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: isSending ? 'rgba(96,192,128,0.06)' : hovered ? 'var(--bg-elevated)' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      {/* Avatar */}
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarStyle.bg, color: avatarStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
        {prospect.initials}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {prospect.name}
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {prospect.company}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
            {prospect.role}
          </span>
          <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 500, background: signal.bg, color: signal.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {signal.label}
          </span>
        </div>
      </div>

      {/* Channel */}
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500, background: channelStyle.bg, color: channelStyle.color, flexShrink: 0, width: 70, textAlign: 'center' }}>
        {prospect.channel}
      </span>

      {/* Timer / status */}
      <div style={{ width: 82, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {isSending ? (
          <SendingBadge />
        ) : isPaused ? (
          <span style={{ fontSize: 10, fontWeight: 500, color: '#633806', background: '#FAEEDA', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
            Paused
          </span>
        ) : (
          <div style={{ textAlign: 'right', minWidth: 60 }}>
            <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)', color: timeLeft < 60 ? '#60c080' : 'var(--text-primary)' }}>
              {fmtTime(timeLeft)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>until send</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ width: 118, display: 'flex', justifyContent: 'flex-end', gap: 5, flexShrink: 0 }}>
        {!isSending && (
          <ActionButton onClick={() => onTogglePause(prospect.id)}>
            {isPaused ? 'Resume' : 'Pause'}
          </ActionButton>
        )}
        <ActionButton onClick={() => onSkip(prospect.id)} danger>
          Skip
        </ActionButton>
      </div>
    </div>
  )
}

function SendingBadge() {
  const [dim, setDim] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setDim(d => !d), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontSize: 10, fontWeight: 500, color: '#27500A', background: '#EAF3DE', padding: '2px 8px', borderRadius: 4, flexShrink: 0, opacity: dim ? 0.5 : 1, transition: 'opacity 0.4s ease' }}>
      Sending...
    </span>
  )
}

function ActionButton({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '3px 9px',
        borderRadius: 5,
        border: '1px solid var(--border-bright)',
        background: hovered ? 'var(--bg-elevated)' : 'transparent',
        color: danger ? (hovered ? '#e06040' : 'var(--text-muted)') : (hovered ? 'var(--text-primary)' : 'var(--text-muted)'),
        fontSize: 11,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}
