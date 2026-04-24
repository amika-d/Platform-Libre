'use client'

import { BarChart2, BookOpen, FileText, GitBranch, Globe, History, MessageSquareText, Sparkles, Users, X, type LucideIcon } from 'lucide-react'
import { HISTORY_RESEARCH_SOURCES } from '@/lib/historyResearch'

export type SidebarTab = 'intelligence' | 'content' | 'outreach' | 'signals' | 'ab' | 'history'

type ContextItem = {
  id: string
  title: string
  subtitle: string
  icon: LucideIcon
}

type PostItem = {
  id: string
  title: string
  platform: 'LinkedIn' | 'Email'
  status: 'Draft' | 'Scheduled' | 'Ready'
  snippet: string
  updatedAt: string
}

const contentPosts: PostItem[] = [
  {
    id: 'post-1',
    title: 'Signal-Aware Outreach Wins',
    platform: 'LinkedIn',
    status: 'Ready',
    snippet: 'Lilian does not send more emails. She sends the right ones, grounded in buyer intent.',
    updatedAt: '2m ago',
  },
  {
    id: 'post-2',
    title: 'The SDR Tool That Reads The Room',
    platform: 'Email',
    status: 'Draft',
    snippet: 'Your prospects are flooded with generic outbound. Lilian uses live signals before writing.',
    updatedAt: '9m ago',
  },
  {
    id: 'post-3',
    title: 'Series B VP Sales Narrative',
    platform: 'LinkedIn',
    status: 'Scheduled',
    snippet: 'Automation is table stakes now. Relevance and timing are what drive real replies.',
    updatedAt: '21m ago',
  },
  {
    id: 'post-4',
    title: 'Competitor-Contrast Email v2',
    platform: 'Email',
    status: 'Ready',
    snippet: 'Most AI SDR tools optimize volume. Lilian optimizes for conversations that convert.',
    updatedAt: '43m ago',
  },
  {
    id: 'post-5',
    title: 'Buyer Fatigue Hook Variant',
    platform: 'LinkedIn',
    status: 'Draft',
    snippet: 'Everyone promises 10x pipeline. Most deliver 10x noise. Here is the signal-first alternative.',
    updatedAt: '1h ago',
  },
]

const contextMap: Record<SidebarTab, { title: string; eyebrow: string; items: ContextItem[] }> = {
  intelligence: {
    title: 'Intelligence',
    eyebrow: 'Market scanning',
    items: [
      { id: 'intel-1', title: 'AI SDR positioning gap', subtitle: '34 sources scanned · reply quality gap', icon: Globe },
      { id: 'intel-2', title: 'Competitor language trends', subtitle: 'Apollo, Outreach, Clay messaging', icon: BookOpen },
      { id: 'intel-3', title: 'Audience pain signals', subtitle: 'Buyer fatigue, robotic outreach, trust loss', icon: MessageSquareText },
      { id: 'intel-4', title: 'Pricing pressure watch', subtitle: 'Race-to-bottom patterns detected', icon: Sparkles },
    ],
  },
  content: {
    title: 'Content',
    eyebrow: 'Draft generation',
    items: [
      { id: 'content-1', title: 'LinkedIn campaign draft', subtitle: 'Hook, body, CTA, and variant options', icon: FileText },
      { id: 'content-2', title: 'Cold email sequence', subtitle: 'Subject lines, openers, follow-ups', icon: MessageSquareText },
      { id: 'content-3', title: 'Offer framing', subtitle: 'Value prop angles for VP Sales', icon: Sparkles },
      { id: 'content-4', title: 'Voice and tone notes', subtitle: 'Concise, direct, evidence-led', icon: BookOpen },
    ],
  },
  outreach: {
    title: 'Outreach',
    eyebrow: 'Targeting and deployment',
    items: [
      { id: 'outreach-1', title: 'VP Sales target list', subtitle: 'Series B accounts with active hiring', icon: Users },
      { id: 'outreach-2', title: 'Channel plan', subtitle: 'LinkedIn, cold email, and follow-up logic', icon: MessageSquareText },
      { id: 'outreach-3', title: 'Sequence variants', subtitle: 'Competitor contrast vs empathy angle', icon: GitBranch },
      { id: 'outreach-4', title: 'Response routing', subtitle: 'Positive, neutral, and objection handling', icon: Sparkles },
    ],
  },
  signals: {
    title: 'Signals',
    eyebrow: 'Live response data',
    items: [
      { id: 'signal-1', title: 'Reply-rate trend', subtitle: 'Variant B outperforming by 8%', icon: BarChart2 },
      { id: 'signal-2', title: 'Engagement spikes', subtitle: 'Prospect clicks on empathy-led hooks', icon: Sparkles },
      { id: 'signal-3', title: 'Drop-off points', subtitle: 'Email opens high, reply intent weaker', icon: MessageSquareText },
      { id: 'signal-4', title: 'Market temperature', subtitle: 'High interest in human-feeling automation', icon: Globe },
    ],
  },
  ab: {
    title: 'A/B Tests',
    eyebrow: 'Variant control panel',
    items: [
      { id: 'ab-1', title: 'Current test: outreach opener', subtitle: 'Competitor gap vs buyer empathy', icon: GitBranch },
      { id: 'ab-2', title: 'Winning variant', subtitle: 'Variant B leading on predicted reply rate', icon: BarChart2 },
      { id: 'ab-3', title: 'Next split to test', subtitle: 'CTA framing and proof points', icon: Sparkles },
      { id: 'ab-4', title: 'Test history', subtitle: 'Prior experiments and lift results', icon: History },
    ],
  },
  history: {
    title: 'History',
    eyebrow: 'Recent campaigns',
    items: [
      { id: 'hist-1', title: 'AI SDR positioning gap', subtitle: 'Today, 09:42 · market intelligence', icon: Globe },
      { id: 'hist-2', title: 'VP Sales outreach variants', subtitle: 'Today, 09:44 · A/B comparison', icon: GitBranch },
      { id: 'hist-3', title: 'LinkedIn Series B campaign', subtitle: 'Yesterday, 14:30 · generated content', icon: FileText },
      { id: 'hist-4', title: 'Reply rate analysis', subtitle: 'Yesterday, 11:00 · feedback loop', icon: BarChart2 },
    ],
  },
}

interface ContextPanelProps {
  activeTab: SidebarTab
  selectedHistorySourceId: string
  onHistorySourceSelect: (sourceId: string) => void
  onClose: () => void
}

export default function ContextPanel({ activeTab, selectedHistorySourceId, onHistorySourceSelect, onClose }: ContextPanelProps) {
  const context = contextMap[activeTab]
  const isContent = activeTab === 'content'
  const isIntelligence = activeTab === 'intelligence'
  const isHistory = activeTab === 'history'
  const selectedHistorySource = HISTORY_RESEARCH_SOURCES.find(source => source.id === selectedHistorySourceId) ?? HISTORY_RESEARCH_SOURCES[0]

  const statusStyle = (status: PostItem['status']) => {
    if (status === 'Ready') return { bg: '#EAF3DE', color: '#27500A' }
    if (status === 'Scheduled') return { bg: '#E6F1FB', color: '#0C447C' }
    return { bg: '#FAEEDA', color: '#633806' }
  }

  return (
    <aside
      style={{
        width: 300,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {context.eyebrow}
            </p>
            <p style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {context.title}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close right sidebar"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
          >
            <X size={14} />
          </button>
        </div>
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
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {isContent ? 'Browse all posts...' : isIntelligence ? 'Browse market maps...' : activeTab === 'history' ? 'Search history...' : `Browse ${context.title.toLowerCase()} items...`}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {isIntelligence && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Live Maps
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                2 active
              </p>
            </div>

            <button
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>Positioning Gap Map</p>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Updated 1m ago</span>
              </div>

              <div style={{ height: 120, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                {[
                  { name: 'Apollo', x: 57, y: 30, c: '#6f6f6f' },
                  { name: 'Outreach', x: 78, y: 24, c: '#8a8a8a' },
                  { name: 'Clay', x: 67, y: 41, c: '#7a7a7a' },
                  { name: 'Lemlist', x: 41, y: 52, c: '#9a9a9a' },
                ].map(point => (
                  <div key={point.name} style={{ position: 'absolute', left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: point.c, display: 'block' }} />
                  </div>
                ))}
                {[
                  { x: 20, y: 76, label: 'Gap A' },
                  { x: 33, y: 57, label: 'Gap B' },
                ].map(gap => (
                  <div key={gap.label} style={{ position: 'absolute', left: `${gap.x}%`, top: `${gap.y}%`, transform: 'translate(-50%, -50%)', padding: '2px 6px', borderRadius: 10, fontSize: 10, background: '#EAF3DE', color: '#27500A' }}>
                    {gap.label}
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Price vs automation reveals two open white-space zones for differentiation.
              </p>
            </button>

            <button
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>Attention Heat Map</p>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Updated 3m ago</span>
              </div>

              <div style={{ height: 120, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                {[
                  { label: 'LinkedIn', x: 66, y: 36, size: 34, c: '#0C447C' },
                  { label: 'Email', x: 28, y: 64, size: 22, c: '#633806' },
                  { label: 'Twitter', x: 77, y: 72, size: 26, c: '#444444' },
                ].map(ch => (
                  <div key={ch.label} style={{ position: 'absolute', left: `${ch.x}%`, top: `${ch.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <span style={{ width: ch.size, height: ch.size, borderRadius: '50%', background: `${ch.c}66`, border: `1px solid ${ch.c}` as string, display: 'block' }} />
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                LinkedIn carries the strongest attention and highest projected reply quality.
              </p>
            </button>

            <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)', padding: '10px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>Key Signals</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  'Buyer-fatigue language up 18% week over week',
                  'Competitor messaging remains volume-first',
                  'Higher engagement on signal-specific hooks',
                ].map(s => (
                  <p key={s} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    • {s}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {isContent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                All Posts
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {contentPosts.length} total
              </p>
            </div>

            {contentPosts.map(post => {
              const status = statusStyle(post.status)
              return (
                <button
                  key={post.id}
                  style={{
                    width: '100%',
                    padding: '10px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.title}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {post.updatedAt}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, borderRadius: 4, padding: '1px 6px', background: post.platform === 'LinkedIn' ? '#E6F1FB' : '#FAEEDA', color: post.platform === 'LinkedIn' ? '#0C447C' : '#633806' }}>
                      {post.platform}
                    </span>
                    <span style={{ fontSize: 10, borderRadius: 4, padding: '1px 6px', background: status.bg, color: status.color }}>
                      {post.status}
                    </span>
                  </div>

                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.snippet}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {isHistory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '2px' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-card)', padding: '10px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Source Inspector
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.45, marginBottom: 4 }}>
                {selectedHistorySource.title}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                {selectedHistorySource.domain} · {selectedHistorySource.published}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 8 }}>
                {selectedHistorySource.snippet}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Why it matters: {selectedHistorySource.whyRelevant}
              </p>
              <a
                href={selectedHistorySource.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: 'var(--signal)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}
              >
                Open source
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 2px' }}>
                All Cited Sources
              </p>
              {HISTORY_RESEARCH_SOURCES.map((source, index) => {
                const isSelected = source.id === selectedHistorySource.id
                return (
                  <button
                    key={source.id}
                    onClick={() => onHistorySourceSelect(source.id)}
                    style={{
                      width: '100%',
                      border: isSelected ? '1px solid var(--signal)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--signal-glow)' : 'var(--bg-card)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <p style={{ fontSize: 11, color: isSelected ? 'var(--signal)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                      [{index + 1}] {source.domain}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {source.title}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!isContent && !isIntelligence && !isHistory && context.items.map((item) => {
          const Icon = item.icon
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
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Icon size={13} color="var(--text-secondary)" strokeWidth={2} />
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
                </div>
              </div>
            </button>
          )
        })}
      </div>

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
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Context synced</p>
          <p style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Live</p>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 4, background: 'var(--signal)', fontSize: 11, fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-sans)' }}>
          Focused
        </div>
      </div>
    </aside>
  )
}