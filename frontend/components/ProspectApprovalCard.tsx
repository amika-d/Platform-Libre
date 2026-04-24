'use client'

import { useMemo, useState } from 'react'
import { approveProspects } from '@/lib/api'

export type ProspectApprovalItem = {
  name: string
  email?: string
  company?: string
  linkedin_url?: string
}

type Props = {
  threadId: string
  initialPending?: ProspectApprovalItem[]
}

export default function ProspectApprovalCard({ threadId, initialPending }: Props) {
  const [pending, setPending] = useState<ProspectApprovalItem[]>(() =>
    Array.isArray(initialPending) ? initialPending : []
  )
  const [approved, setApproved] = useState<ProspectApprovalItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  )

  const itemKey = (item: ProspectApprovalItem) => item.linkedin_url || item.email || item.name

  const toggle = (item: ProspectApprovalItem) => {
    const key = itemKey(item)
    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const approveSelected = async () => {
    const chosen = pending.filter(item => selected[itemKey(item)])
    if (chosen.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      const selectors = chosen.map(item => item.linkedin_url || item.name)
      await approveProspects({
        thread_id: threadId,
        approved: true,
        prospects: selectors,
      })

      setApproved(prev => [...chosen, ...prev])
      setPending(prev => prev.filter(item => !selected[itemKey(item)]))
      setSelected({})
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve prospects.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border-bright)', background: 'var(--bg-card)', overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', color: '#000000' }}>
          PROSPECT APPROVAL
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          pending {pending.length} | approved {approved.length}
        </span>
      </div>

      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ margin: 0, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Not approved prospects
        </p>
        {pending.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No pending prospects.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(item => {
              const key = itemKey(item)
              return (
                <label
                  key={key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr',
                    gap: 8,
                    alignItems: 'start',
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: selected[key] ? 'var(--signal-glow)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selected[key])}
                    onChange={() => toggle(item)}
                    style={{ marginTop: 2 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {item.company || 'Unknown company'}
                      {item.email ? ` | ${item.email}` : ''}
                    </span>
                  </div>
                </label>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => void approveSelected()}
            disabled={isSubmitting || selectedCount === 0 || !threadId}
            style={{
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid var(--signal-dim)',
              background: isSubmitting || selectedCount === 0 ? 'var(--bg-elevated)' : 'var(--signal-glow)',
              color: selectedCount === 0 ? 'var(--text-muted)' : 'var(--signal)',
              fontSize: 12,
              fontWeight: 600,
              cursor: isSubmitting || selectedCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Approving...' : `Approve selected (${selectedCount})`}
          </button>
          {!threadId && (
            <span style={{ fontSize: 11, color: '#9d3124' }}>No active session.</span>
          )}
        </div>
        {error && <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9d3124' }}>{error}</p>}
      </div>

      <div style={{ padding: '14px 16px' }}>
        <p style={{ margin: 0, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Approved prospects
        </p>
        {approved.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No approved prospects yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approved.map(item => (
              <div
                key={itemKey(item)}
                style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-elevated)' }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--signal)' }}>approved</span>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {item.company || 'Unknown company'}
                  {item.email ? ` | ${item.email}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
