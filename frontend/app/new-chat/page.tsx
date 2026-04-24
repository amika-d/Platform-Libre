'use client'

import { useEffect, useMemo, useState } from 'react'
import { PanelRightOpen } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import ChatWorkspace from '@/components/ChatWorkspace'
import ContextPanel, { type SidebarTab } from '@/components/ContextPanel'
import type { HistoryItem } from '@/components/HistoryPanel'
import { HISTORY_RESEARCH_SOURCES } from '@/lib/historyResearch'

type SessionRecord = HistoryItem & {
  threadId: string
  updatedAt: number
}

const RECENTS_STORAGE_KEY = 'veracity-recents'
const SESSION_STORAGE_PREFIX = 'veracity-chat-session:'
const ACTIVE_THREAD_STORAGE_KEY = 'veracity-active-thread'

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createNewSessionRecord(threadId: string): SessionRecord {
  return {
    id: threadId,
    threadId,
    title: 'New session',
    subtitle: 'Start a conversation',
    stage: 'research',
    timestamp: new Date().toLocaleString(),
    updatedAt: Date.now(),
  }
}

function sessionHasMessages(threadId: string): boolean {
  if (typeof window === 'undefined') return false

  const raw = window.localStorage.getItem(`${SESSION_STORAGE_PREFIX}${threadId}`)
  if (!raw) return false

  try {
    const parsed = JSON.parse(raw) as { messages?: unknown[] }
    return Array.isArray(parsed.messages) && parsed.messages.length > 0
  } catch {
    return false
  }
}

export default function NewChatPage() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('content')
  const [workspaceSessionId, setWorkspaceSessionId] = useState(0)
  const [selectedHistorySourceId, setSelectedHistorySourceId] = useState(HISTORY_RESEARCH_SOURCES[0].id)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [showNewChatLanding, setShowNewChatLanding] = useState(true)
  const [sessionThreadId, setSessionThreadId] = useState(() => createSessionId())
  const [recentSessions, setRecentSessions] = useState<SessionRecord[]>([])
  const [hasHydratedRecents, setHasHydratedRecents] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY)
    const activeThreadFromStorage = window.localStorage.getItem(ACTIVE_THREAD_STORAGE_KEY)

    if (!raw) {
      if (activeThreadFromStorage) {
        setSessionThreadId(activeThreadFromStorage)
        setShowNewChatLanding(!sessionHasMessages(activeThreadFromStorage))
      }
      setHasHydratedRecents(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as SessionRecord[]
      if (!Array.isArray(parsed)) return

      const normalized = parsed.filter(
        item => Boolean(item?.threadId) && Boolean(item?.id)
      )
      setRecentSessions(normalized)

      const selectedThreadId =
        (activeThreadFromStorage && normalized.some(item => item.threadId === activeThreadFromStorage)
          ? activeThreadFromStorage
          : normalized[0]?.threadId) || activeThreadFromStorage

      if (selectedThreadId) {
        setSessionThreadId(selectedThreadId)
        setShowNewChatLanding(!sessionHasMessages(selectedThreadId))
      }
    } catch {
      setRecentSessions([])
    } finally {
      setHasHydratedRecents(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!sessionThreadId) return

    window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, sessionThreadId)
  }, [sessionThreadId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasHydratedRecents) return
    window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recentSessions))
  }, [recentSessions, hasHydratedRecents])

  const historyItems = useMemo<HistoryItem[]>(() => {
    return [...recentSessions]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ id, title, subtitle, stage, timestamp }) => ({ id, title, subtitle, stage, timestamp }))
  }, [recentSessions])

  const handleNavigate = (tab: SidebarTab) => {
    setActiveTab(tab)
    if (tab !== 'content') {
      setShowNewChatLanding(false)
    }
    if (tab === 'history') {
      setSelectedHistorySourceId(HISTORY_RESEARCH_SOURCES[0].id)
    }
  }

  const handleNewChat = () => {
    // If the current session already has no messages, don't create a new one.
    if (!sessionHasMessages(sessionThreadId)) {
      setShowNewChatLanding(true)
      setActiveTab('content')
      setWorkspaceSessionId(prev => prev + 1)
      return
    }

    const nextThreadId = createSessionId()
    setSessionThreadId(nextThreadId)
    setRecentSessions(prev => {
      const next = [createNewSessionRecord(nextThreadId), ...prev.filter(item => item.threadId !== nextThreadId)]
      return next.slice(0, 20)
    })
    setActiveTab('content')
    setWorkspaceSessionId(prev => prev + 1)
    setShowNewChatLanding(true)
  }

  const handleSelectRecent = (itemId: string) => {
    const selected = recentSessions.find(item => item.id === itemId)
    if (!selected) return

    setSessionThreadId(selected.threadId)
    setActiveTab('content')
    setWorkspaceSessionId(prev => prev + 1)
    setShowNewChatLanding(!sessionHasMessages(selected.threadId))
  }

  const handleDeleteRecent = (itemId: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`${SESSION_STORAGE_PREFIX}${itemId}`)
    }

    setRecentSessions(prev => prev.filter(item => item.id !== itemId))

    if (itemId === sessionThreadId) {
      handleNewChat()
    }
  }

  const handleSessionActivity = (activity: {
    threadId: string
    title: string
    subtitle: string
    stage: 'research' | 'generate' | 'ab' | 'feedback'
    timestamp: string
  }) => {
    setRecentSessions(prev => {
      const existing = prev.find(item => item.threadId === activity.threadId)
      const nextRecord: SessionRecord = {
        id: activity.threadId,
        threadId: activity.threadId,
        title: activity.title,
        subtitle: activity.subtitle,
        stage: activity.stage,
        timestamp: activity.timestamp,
        updatedAt: Date.now(),
      }

      if (!existing) {
        return [nextRecord, ...prev].slice(0, 20)
      }

      return [nextRecord, ...prev.filter(item => item.threadId !== activity.threadId)].slice(0, 20)
    })
  }

  const handleClearCurrentSessionCache = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`${SESSION_STORAGE_PREFIX}${sessionThreadId}`)
      window.localStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY)
    }

    setRecentSessions(prev => prev.filter(item => item.threadId !== sessionThreadId))
    setWorkspaceSessionId(prev => prev + 1)
    setShowNewChatLanding(true)
    setActiveTab('content')
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      <Sidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onNewChat={handleNewChat}
        onClearCurrentSessionCache={handleClearCurrentSessionCache}
        historyItems={historyItems}
        activeRecentId={sessionThreadId}
        onSelectRecent={handleSelectRecent}
        onDeleteRecent={handleDeleteRecent}
      />
      <ChatWorkspace
        activeTab={activeTab}
        workspaceSessionId={workspaceSessionId}
        sessionThreadId={sessionThreadId}
        showNewChatLanding={showNewChatLanding}
        selectedHistorySourceId={selectedHistorySourceId}
        onHistorySourceSelect={setSelectedHistorySourceId}
        onSessionActivity={handleSessionActivity}
      />
      {isRightPanelOpen ? (
        <ContextPanel
          activeTab={activeTab}
          selectedHistorySourceId={selectedHistorySourceId}
          onHistorySourceSelect={setSelectedHistorySourceId}
          onClose={() => setIsRightPanelOpen(false)}
        />
      ) : (
        <button
          type="button"
          aria-label="Open right sidebar"
          onClick={() => setIsRightPanelOpen(true)}
          style={{
            position: 'absolute',
            top: 18,
            right: 14,
            width: 34,
            height: 34,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          }}
        >
          <PanelRightOpen size={16} />
        </button>
      )}
    </div>
  )
}
