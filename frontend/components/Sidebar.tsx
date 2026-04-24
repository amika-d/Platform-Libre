'use client'

import { useState } from 'react'
import {
  Zap, Globe, FileText, BarChart2,
  Settings, Search, Plus, Users, GitBranch, Briefcase, ChevronDown, ChevronRight, Trash2
} from 'lucide-react'
import type { HistoryItem } from './HistoryPanel'
import type { SidebarTab } from './ContextPanel'

type NavItem = {
  icon: typeof Zap
  label: string
  id: SidebarTab
}

const navItems: NavItem[] = [
  { icon: Globe, label: 'Intelligence', id: 'intelligence' },
  { icon: FileText, label: 'Content', id: 'content' },
  { icon: Users, label: 'Outreach', id: 'outreach' },
  { icon: BarChart2, label: 'Signals', id: 'signals' },
  { icon: GitBranch, label: 'A/B Tests', id: 'ab' },
]

interface SidebarProps {
  activeTab: SidebarTab
  onNavigate: (tab: SidebarTab) => void
  onNewChat: () => void
  onClearCurrentSessionCache: () => void
  historyItems: HistoryItem[]
  activeRecentId?: string
  onSelectRecent: (itemId: string) => void
  onDeleteRecent: (itemId: string) => void
}

const stageColor = {
  research: '#111111',
  generate: '#333333',
  ab: '#555555',
  feedback: '#777777',
}

export default function Sidebar({ activeTab, onNavigate, onNewChat, onClearCurrentSessionCache, historyItems, activeRecentId, onSelectRecent, onDeleteRecent }: SidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const [navOpen, setNavOpen] = useState(true)
  const [recentOpen, setRecentOpen] = useState(true)

  return (
    <aside
      style={{
        width: expanded ? 280 : 64,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        padding: expanded ? '12px 10px 10px' : '16px 0',
        gap: expanded ? 10 : 4,
        flexShrink: 0,
        zIndex: 10,
        transition: 'width 0.2s ease, padding 0.2s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: expanded ? 'space-between' : 'center', gap: 8, marginBottom: expanded ? 4 : 20 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: 'var(--signal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Zap size={18} color="#ffffff" strokeWidth={2.5} />
        </div>
        {expanded && (
          <p style={{ fontSize: 28, lineHeight: 1, color: 'var(--text-muted)', marginLeft: 'auto', marginRight: 2 }}>⋯</p>
        )}
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
          {[
            { icon: Plus, label: 'New chat' },
            { icon: Search, label: 'Search' },
            { icon: Zap, label: 'Clear session cache' },
            { icon: Briefcase, label: 'Customize' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => {
                if (label === 'New chat') onNewChat()
                if (label === 'Clear session cache') onClearCurrentSessionCache()
              }}
              style={{
                height: 34,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span style={{ fontSize: 13 }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {expanded && (
        <button
          onClick={() => setNavOpen(prev => !prev)}
          style={{
            height: 30,
            width: '100%',
            border: 'none',
            borderRadius: 7,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <span>Navigation</span>
          {navOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      )}

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: expanded ? 'stretch' : 'center' }}>
        {(expanded && !navOpen ? [] : navItems).map(({ icon: Icon, label, id }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => {
                onNavigate(id)
              }}
              title={label}
              style={{
                width: expanded ? '100%' : 44,
                height: 44,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: expanded ? 'flex-start' : 'center',
                gap: expanded ? 10 : 0,
                padding: expanded ? '0 10px' : 0,
                background: active ? 'var(--signal-glow)' : 'transparent',
                color: active ? 'var(--signal)' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                }
              }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    left: -2,
                    width: 3,
                    height: 20,
                    borderRadius: '0 2px 2px 0',
                    background: 'var(--signal)',
                  }}
                />
              )}
              <Icon size={18} strokeWidth={1.8} />
              {expanded && <span style={{ fontSize: 13 }}>{label}</span>}
            </button>
          )
        })}
      </div>

      {expanded && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 10, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => setRecentOpen(prev => !prev)}
            style={{
              height: 30,
              width: '100%',
              border: 'none',
              borderRadius: 7,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <span>Recents</span>
            {recentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {recentOpen && (
            <div style={{ overflowY: 'auto', paddingRight: 2 }}>
              {historyItems.map((item) => (
              (() => {
                const isActiveRecent = item.id === activeRecentId
                return (
              <button
                key={item.id}
                onClick={() => onSelectRecent(item.id)}
                style={{
                  width: '100%',
                  background: isActiveRecent ? 'var(--signal-glow)' : 'transparent',
                  textAlign: 'left',
                  borderRadius: 8,
                  padding: '8px 8px',
                  cursor: 'pointer',
                  marginBottom: 2,
                  border: isActiveRecent ? '1px solid var(--signal-dim)' : '1px solid transparent',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                className="session-item"
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isActiveRecent ? 'var(--signal-glow)' : 'transparent' }}
              >
                <p style={{ fontSize: 13, color: isActiveRecent ? 'var(--signal)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2, width: 'calc(100% - 20px)' }}>
                  {item.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: stageColor[item.stage], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.timestamp}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteRecent(item.id)
                  }}
                  className="delete-session-btn"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 6,
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    opacity: 0,
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={e => {
                    e.stopPropagation()
                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)'
                    e.currentTarget.style.color = '#ff4d4d'
                  }}
                  onMouseLeave={e => {
                    e.stopPropagation()
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </button>
                )
              })()
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom */}
      <button
        title="Settings"
        style={{
          width: expanded ? '100%' : 44,
          height: 44,
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          gap: expanded ? 10 : 0,
          padding: expanded ? '0 10px' : 0,
          background: 'transparent',
          color: 'var(--text-muted)',
        }}
      >
        <Settings size={16} strokeWidth={1.8} />
        {expanded && <span style={{ fontSize: 13 }}>Settings</span>}
      </button>

      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          marginTop: 4,
          alignSelf: expanded ? 'flex-start' : 'center',
          marginLeft: expanded ? 6 : 0,
        }}
      >
        V
      </div>
    </aside>
  )
}
