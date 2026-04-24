'use client'

import { useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'

interface LinkedInPostCardProps {
  title: string
  initialDescription: string
  initialSeed: number
  isStreaming?: boolean
  generatedPosts?: LinkedInGeneratedPost[]
}

interface LinkedInGeneratedPost {
  id?: string
  angle?: string
  hook?: string
  body?: string
  cta?: string
  hashtags?: string[]
  image_url?: string
}

interface DisplayPost {
  label: string
  text: string
  hashtags: string[]
  imageUrl?: string
}

const HASHTAGS = ['#AISales', '#SDR', '#B2BSales', '#SalesSignals']
const IMG_STYLES = [
  'Abstract geometric · navy + amber',
  'Bold typography · dark bg',
  'Clean product mockup',
  'Isometric diagram · teal',
  'Minimalist split screen',
]

function buildMockImage(seed: number, title: string) {
  const palette = [
    ['#111111', '#363636', '#d7d7d7'],
    ['#1b1b1b', '#565656', '#eeeeee'],
    ['#141414', '#404040', '#dcdcdc'],
    ['#171717', '#4b4b4b', '#efefef'],
  ][seed % 4]

  const heading = title.length > 40 ? `${title.slice(0, 37)}...` : title

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="628" viewBox="0 0 1200 628">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}" />
          <stop offset="100%" stop-color="${palette[1]}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="628" fill="url(#bg)" />
      <rect x="60" y="60" width="1080" height="508" rx="26" fill="#ffffff" fill-opacity="0.08" />
      <rect x="130" y="140" width="460" height="22" rx="11" fill="#ffffff" fill-opacity="0.38" />
      <rect x="130" y="176" width="390" height="22" rx="11" fill="#ffffff" fill-opacity="0.24" />
      <rect x="130" y="230" width="760" height="18" rx="9" fill="#ffffff" fill-opacity="0.20" />
      <rect x="130" y="262" width="680" height="18" rx="9" fill="#ffffff" fill-opacity="0.16" />
      <text x="130" y="364" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${heading
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const DEFAULT_LINKEDIN_TEXT = `Stop treating SOC2 like a tax. Start treating it like a revenue engine.

For Seed/Series A SaaS founders, the biggest compliance mistake is not failing an audit. It is viewing SOC2 and ISO27001 as pure cost.

The real cost is the enterprise sales cycle you lose because you are not compliant in the first conversation.

Automated compliance is not about checking boxes. It is about removing friction from your next funding round or enterprise logo.`

export default function LinkedInPostCard({ title, initialDescription, initialSeed, isStreaming = false, generatedPosts }: LinkedInPostCardProps) {
  const displayTitle = useTypingAnimation({ text: title, isActive: isStreaming })
  const pendingUploadIndexRef = useRef<number | null>(null)

  const posts = useMemo<DisplayPost[]>(() => {
    if (generatedPosts && generatedPosts.length > 0) {
      return generatedPosts.map((post, index) => {
        const label = post.id || (index === 0 ? 'A' : index === 1 ? 'B' : `V${index + 1}`)
        const text = [post.hook, post.body, post.cta].filter(Boolean).join('\n\n').trim() || initialDescription || DEFAULT_LINKEDIN_TEXT
        return {
          label,
          text,
          hashtags: post.hashtags?.length ? post.hashtags : HASHTAGS,
          imageUrl: post.image_url,
        }
      })
    }

    return [
      {
        label: 'A',
        text: initialDescription || DEFAULT_LINKEDIN_TEXT,
        hashtags: HASHTAGS,
      },
      {
        label: 'B',
        text: initialDescription || DEFAULT_LINKEDIN_TEXT,
        hashtags: HASHTAGS,
      },
    ]
  }, [generatedPosts, initialDescription])

  const [textByIndex, setTextByIndex] = useState<Record<number, string>>(() =>
    Object.fromEntries(posts.map((post, index) => [index, post.text]))
  )
  const [hashtagsByIndex, setHashtagsByIndex] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(posts.map((post, index) => [index, post.hashtags]))
  )
  const [uploadedImages, setUploadedImages] = useState<Record<number, string | null>>({})
  const [deletedImages, setDeletedImages] = useState<Record<number, boolean>>({})
  const [generatedImages, setGeneratedImages] = useState<Record<number, boolean>>({})
  const [seedByIndex, setSeedByIndex] = useState<Record<number, number>>({})
  const [styleIndexByIndex, setStyleIndexByIndex] = useState<Record<number, number>>({})
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null)
  const [isEditTextOpen, setIsEditTextOpen] = useState(false)
  const [editTargetIndex, setEditTargetIndex] = useState<number | null>(null)
  const [editTextDraft, setEditTextDraft] = useState('')
  const [isAddHashtagOpen, setIsAddHashtagOpen] = useState(false)
  const [hashtagTargetIndex, setHashtagTargetIndex] = useState<number | null>(null)
  const [hashtagDraft, setHashtagDraft] = useState('')
  const [statusText, setStatusText] = useState('Ready to publish')
  const [statusColor, setStatusColor] = useState('#639922')
  const [footerText, setFooterText] = useState('Generated from competitor gap signal · 3 sources')

  const setStatus = (label: string, color: string) => {
    setStatusText(label)
    setStatusColor(color)
  }

  const getText = (index: number) => textByIndex[index] ?? posts[index]?.text ?? DEFAULT_LINKEDIN_TEXT
  const getHashtags = (index: number) => hashtagsByIndex[index] ?? posts[index]?.hashtags ?? HASHTAGS

  const getImageSrc = (index: number) => {
    const uploaded = uploadedImages[index]
    if (uploaded) return uploaded

    const removed = deletedImages[index]
    if (!removed && posts[index]?.imageUrl) return posts[index]?.imageUrl

    if (generatedImages[index]) {
      const seed = seedByIndex[index] ?? initialSeed + index
      return buildMockImage(seed, `${displayTitle} ${posts[index]?.label || ''}`)
    }

    return null
  }

  const regenerateImage = (index: number) => {
    setStatus('Generating visual...', '#EF9F27')
    setDeletedImages(prev => ({ ...prev, [index]: false }))
    setUploadedImages(prev => ({ ...prev, [index]: null }))
    setGeneratedImages(prev => ({ ...prev, [index]: true }))
    setSeedByIndex(prev => ({ ...prev, [index]: (prev[index] ?? initialSeed + index) + 1 }))
    setStyleIndexByIndex(prev => ({ ...prev, [index]: ((prev[index] ?? 0) + 1) % IMG_STYLES.length }))
    const nextStyle = IMG_STYLES[((styleIndexByIndex[index] ?? 0) + 1) % IMG_STYLES.length]
    setStatus('Visual ready', '#639922')
    setFooterText(`Variant ${posts[index]?.label || index + 1} · ${nextStyle}`)
  }

  const onUploadClick = (index: number) => {
    pendingUploadIndexRef.current = index
    const input = document.getElementById('linkedin-image-upload') as HTMLInputElement | null
    input?.click()
  }

  const onDeleteImage = (index: number) => {
    setUploadedImages(prev => ({ ...prev, [index]: null }))
    setDeletedImages(prev => ({ ...prev, [index]: true }))
    setGeneratedImages(prev => ({ ...prev, [index]: false }))
    setStatus('Visual removed', '#EF9F27')
    setFooterText(`Variant ${posts[index]?.label || index + 1} · visual removed`)
  }

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const targetIndex = pendingUploadIndexRef.current
    const file = event.target.files?.[0]
    if (!file || targetIndex === null) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const uploadedDataUrl = reader.result
        setUploadedImages(prev => ({ ...prev, [targetIndex]: uploadedDataUrl }))
        setDeletedImages(prev => ({ ...prev, [targetIndex]: false }))
        setGeneratedImages(prev => ({ ...prev, [targetIndex]: true }))
        setStatus('Visual ready', '#639922')
        setFooterText(`Variant ${posts[targetIndex]?.label || targetIndex + 1} · uploaded image`)
      }
    }
    reader.readAsDataURL(file)
    pendingUploadIndexRef.current = null
    event.currentTarget.value = ''
  }

  const openEditText = (index: number) => {
    setEditTargetIndex(index)
    setEditTextDraft(getText(index))
    setIsEditTextOpen(true)
  }

  const applyEditText = () => {
    if (editTargetIndex === null) return
    const next = editTextDraft.trim()
    if (!next) return
    setTextByIndex(prev => ({ ...prev, [editTargetIndex]: next }))
    setIsEditTextOpen(false)
    setStatus('Post copy updated', '#639922')
    setFooterText(`Variant ${posts[editTargetIndex]?.label || editTargetIndex + 1} · copy edited`)
  }

  const openAddHashtag = (index: number) => {
    setHashtagTargetIndex(index)
    setHashtagDraft('')
    setIsAddHashtagOpen(true)
  }

  const addHashtag = () => {
    if (hashtagTargetIndex === null) return
    const normalized = hashtagDraft.trim().replace(/\s+/g, '')
    if (!normalized) return

    const tag = normalized.startsWith('#') ? normalized : `#${normalized}`
    const currentTags = getHashtags(hashtagTargetIndex)
    if (currentTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      setHashtagDraft('')
      setIsAddHashtagOpen(false)
      return
    }

    setHashtagsByIndex(prev => ({ ...prev, [hashtagTargetIndex]: [...currentTags, tag] }))
    setHashtagDraft('')
    setIsAddHashtagOpen(false)
    setStatus('Hashtag added', '#639922')
    setFooterText(`Variant ${posts[hashtagTargetIndex]?.label || hashtagTargetIndex + 1} · hashtag added`)
  }

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid var(--border-bright)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '11px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>LinkedIn preview grid</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{displayTitle}</span>
        </div>

        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
          {statusText}
        </span>
      </div>

      <div style={{ minHeight: 340, padding: 14, background: 'var(--bg-elevated)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {posts.map((post, index) => {
            const imageSrc = getImageSrc(index)
            const text = getText(index)
            const tags = getHashtags(index)

            return (
              <div
                key={`${post.label}-${index}`}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: '#0C447C', fontWeight: 700, background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: 999, padding: '2px 8px' }}>
                    {post.label}
                  </span>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button onClick={() => openEditText(index)} style={editorButtonStyleSmall}>
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button onClick={() => regenerateImage(index)} style={editorButtonStyleSmall}>
                      <RefreshCw size={12} />
                      Visual
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                    JD
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>James Doe</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>AI-powered SDR at Lilian · 2nd</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Just now · Public</p>
                  </div>
                </div>

                <div style={{ padding: '0 12px 10px' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {text}
                  </p>

                  <div style={{ marginTop: 10, border: '1px solid var(--border-bright)', borderRadius: 8, padding: '8px 9px', background: 'var(--bg-elevated)' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {tags.map(tag => (
                        <span key={tag} style={{ padding: '2px 7px', borderRadius: 20, fontSize: 11, background: '#E6F1FB', color: '#0C447C' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button onClick={() => openAddHashtag(index)} style={editorButtonStyleSmall}>
                      <Plus size={12} />
                      Add hashtag
                    </button>
                  </div>
                </div>

                <div
                  onMouseEnter={() => setHoveredImageIndex(index)}
                  onMouseLeave={() => setHoveredImageIndex(null)}
                  style={{ position: 'relative', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
                >
                  {imageSrc ? (
                    <img src={imageSrc} alt={`LinkedIn visual ${post.label}`} style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', gap: 8 }}>
                      <ImageIcon size={18} style={{ opacity: 0.5 }} />
                      LinkedIn visual
                    </div>
                  )}

                  {hoveredImageIndex === index && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        display: 'inline-flex',
                        gap: 8,
                      }}
                    >
                      <button onClick={() => onUploadClick(index)} style={overlayIconButton} title="Upload image">
                        <Upload size={14} />
                      </button>
                      <button onClick={() => onDeleteImage(index)} style={overlayIconButton} title="Delete image">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                  {['Like', 'Comment', 'Repost'].map(action => (
                    <button
                      key={action}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        border: 'none',
                        borderRight: action === 'Repost' ? 'none' : '1px solid var(--border)',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{footerText}</span>
        <div style={{ flex: 1 }} />
        <button style={editorButtonStyle}>{'Add to queue ->'}</button>
      </div>

      {isEditTextOpen && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <p style={modalTitleStyle}>Edit LinkedIn post text</p>
            <textarea
              rows={10}
              value={editTextDraft}
              onChange={e => setEditTextDraft(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 11px',
                fontSize: 12,
                color: 'var(--text-primary)',
                resize: 'vertical',
                background: 'var(--bg-card)',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button onClick={() => setIsEditTextOpen(false)} style={editorButtonStyle}>Cancel</button>
              <button onClick={applyEditText} style={primaryButtonStyle}>Save text</button>
            </div>
          </div>
        </div>
      )}

      {isAddHashtagOpen && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyleSmall}>
            <p style={modalTitleStyle}>Add hashtag</p>
            <input
              value={hashtagDraft}
              onChange={e => setHashtagDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addHashtag()
              }}
              placeholder="#StartupGrowth"
              style={promptInputStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button onClick={() => setIsAddHashtagOpen(false)} style={editorButtonStyle}>Cancel</button>
              <button onClick={addHashtag} style={primaryButtonStyle}>Add</button>
            </div>
          </div>
        </div>
      )}

      <input id="linkedin-image-upload" type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
    </div>
  )
}

const editorButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid var(--border-bright)',
  background: 'transparent',
  fontSize: 11,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const primaryButtonStyle: React.CSSProperties = {
  ...editorButtonStyle,
  background: '#E6F1FB',
  color: '#0C447C',
  borderColor: '#B5D4F4',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const promptInputStyle: React.CSSProperties = {
  flex: 1,
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 11,
  color: 'var(--text-primary)',
  background: 'var(--bg-card)',
  fontFamily: 'var(--font-sans)',
}

const editorButtonStyleSmall: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 999,
  border: '1px solid var(--border-bright)',
  background: 'transparent',
  fontSize: 11,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
}

const overlayIconButton: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.55)',
  background: 'rgba(9, 12, 18, 0.62)',
  color: '#F8FAFC',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 1000,
}

const modalCardStyle: React.CSSProperties = {
  width: 'min(720px, 96vw)',
  borderRadius: 12,
  border: '1px solid var(--border-bright)',
  background: 'var(--bg-elevated)',
  padding: 14,
}

const modalCardStyleSmall: React.CSSProperties = {
  width: 'min(380px, 92vw)',
  borderRadius: 12,
  border: '1px solid var(--border-bright)',
  background: 'var(--bg-elevated)',
  padding: 14,
}

const modalTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 8px',
}
