'use client'

import { useMemo, useState } from 'react'
import JSZip from 'jszip'
import { Download, Image as ImageIcon, Sparkles } from 'lucide-react'
import { useTypingAnimation } from '@/hooks/useTypingAnimation'

export interface FlyerVariant {
  id?: string
  title?: string
  signal_reference?: string
  headline?: string
  subheadline?: string
  body?: string
  bullet_points?: string[]
  social_proof?: string
  cta?: string
  image_url?: string
  image_prompt?: string
  format?: string
}

interface FlyerCardProps {
  title: string
  intro?: string
  flyers?: FlyerVariant[]
  isStreaming?: boolean
}

function buildPlaceholderImage(title: string, headline: string) {
  const safeTitle = (title || 'Campaign Flyer').replace(/[&<>]/g, '')
  const safeHeadline = (headline || 'Signal-aware creative').replace(/[&<>]/g, '')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" fill="url(#bg)" />
      <rect x="60" y="60" width="1080" height="600" rx="24" fill="#ffffff" fill-opacity="0.08"/>
      <text x="120" y="180" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#ffffff">${safeTitle}</text>
      <text x="120" y="250" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#e2e8f0">${safeHeadline}</text>
      <rect x="120" y="316" width="520" height="12" rx="6" fill="#cbd5e1" fill-opacity="0.5"/>
      <rect x="120" y="340" width="470" height="12" rx="6" fill="#cbd5e1" fill-opacity="0.35"/>
      <rect x="120" y="402" width="210" height="54" rx="27" fill="#22c55e"/>
      <text x="158" y="437" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#06240f">Learn more</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'flyer'
}

function buildFlyerText(title: string, flyer: FlyerVariant) {
  const sections: string[] = []

  sections.push(`Title: ${title}`)
  if (flyer.id) sections.push(`Variant: ${flyer.id}`)
  if (flyer.signal_reference) sections.push(`Signal reference: ${flyer.signal_reference}`)
  if (flyer.headline) sections.push(`Headline: ${flyer.headline}`)
  if (flyer.subheadline) sections.push(`Subheadline: ${flyer.subheadline}`)
  if (flyer.body) {
    sections.push('Body:', flyer.body)
  }
  if (Array.isArray(flyer.bullet_points) && flyer.bullet_points.length > 0) {
    sections.push('Bullet points:', ...flyer.bullet_points.map((point, index) => `${index + 1}. ${point}`))
  }
  if (flyer.social_proof) sections.push(`Social proof: ${flyer.social_proof}`)
  if (flyer.cta) sections.push(`CTA: ${flyer.cta}`)
  if (flyer.format) sections.push(`Format: ${flyer.format}`)
  if (flyer.image_prompt) sections.push(`Image prompt: ${flyer.image_prompt}`)

  return sections.join('\n\n') + '\n'
}

export default function FlyerCard({ title, intro, flyers = [], isStreaming = false }: FlyerCardProps) {
  const safeFlyers = flyers.length > 0 ? flyers : [{ title, headline: 'Flyer generated', body: intro || '' }]
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const activeFlyer = safeFlyers[activeIndex]
  const displayTitle = useTypingAnimation({ text: title, isActive: isStreaming })
  const displayHeadline = useTypingAnimation({ text: activeFlyer.headline || title, isActive: isStreaming })

  const imageSrc = useMemo(
    () => activeFlyer.image_url || buildPlaceholderImage(activeFlyer.title || displayTitle, activeFlyer.headline || ''),
    [activeFlyer.image_url, activeFlyer.title, activeFlyer.headline, displayTitle]
  )

  const handleDownload = async () => {
    if (isStreaming || isDownloading) return

    setIsDownloading(true)

    try {
      const zip = new JSZip()
      const baseName = sanitizeFileName(activeFlyer.title || activeFlyer.id || displayTitle || title || 'flyer')
      const textFileName = `${baseName}.txt`

      let imageBlob: Blob
      try {
        const imageResponse = await fetch(imageSrc)
        imageBlob = await imageResponse.blob()
      } catch {
        const fallbackImage = buildPlaceholderImage(activeFlyer.title || displayTitle || title, activeFlyer.headline || '')
        const fallbackResponse = await fetch(fallbackImage)
        imageBlob = await fallbackResponse.blob()
      }

      const imageType = imageBlob.type || 'image/png'
      const imageExtension = imageType.includes('svg')
        ? 'svg'
        : imageType.includes('jpeg') || imageType.includes('jpg')
          ? 'jpg'
          : imageType.includes('webp')
            ? 'webp'
            : 'png'

      zip.file(`${baseName}.${imageExtension}`, imageBlob)
      zip.file(textFileName, buildFlyerText(activeFlyer.title || displayTitle || title, activeFlyer))

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${baseName}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid var(--border-bright)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        marginTop: 6,
        width: '50%',
        alignSelf: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Flyer Preview</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{safeFlyers.length} variant{safeFlyers.length > 1 ? 's' : ''}</span>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {activeFlyer.title || displayTitle}
          </p>
          {activeFlyer.signal_reference && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 3 }}>
              {activeFlyer.signal_reference}
            </p>
          )}
          {activeFlyer.headline && (
            <p style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
              {displayHeadline}
            </p>
          )}
          {activeFlyer.subheadline && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 3 }}>
              {activeFlyer.subheadline}
            </p>
          )}
        </div>

        {safeFlyers.length > 1 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {safeFlyers.map((flyer, index) => (
              <button
                key={`${flyer.id || 'flyer'}-${index}`}
                onClick={() => setActiveIndex(index)}
                style={{
                  borderRadius: 999,
                  border: index === activeIndex ? '1px solid var(--signal-dim)' : '1px solid var(--border-bright)',
                  background: index === activeIndex ? 'var(--signal-glow)' : 'transparent',
                  color: index === activeIndex ? 'var(--signal)' : 'var(--text-muted)',
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
              >
                {flyer.id || `Variant ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            borderRadius: 10,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            background: 'var(--bg-primary)',
            width: '100%',
          }}
        >
          <div style={{ aspectRatio: '1200 / 720', maxHeight: 400, background: 'var(--bg-elevated)' }}>
            {imageSrc ? (
              <img src={imageSrc} alt="Generated flyer" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={24} />
              </div>
            )}
          </div>
        </div>

        {activeFlyer.body && (
          <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {activeFlyer.body}
          </p>
        )}

        {Array.isArray(activeFlyer.bullet_points) && activeFlyer.bullet_points.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 8,
            }}
          >
            {activeFlyer.bullet_points.map((point, index) => (
              <div
                key={`${point}-${index}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  fontSize: 11,
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  borderRadius: 10,
                  border: '1px solid var(--border-bright)',
                  background: 'var(--bg-elevated)',
                  padding: '8px 10px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: 'var(--signal-glow)',
                    color: 'var(--signal)',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {index + 1}
                </span>
                <span style={{ flex: 1 }}>{point}</span>
              </div>
            ))}
          </div>
        )}

        {activeFlyer.social_proof && (
          <div
            style={{
              borderRadius: 12,
              border: '1px solid var(--signal-dim)',
              background: 'linear-gradient(180deg, rgba(82, 138, 255, 0.10), rgba(82, 138, 255, 0.04))',
              padding: '10px 12px',
              fontSize: 10,
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--signal)', marginBottom: 3 }}>
              Social proof
            </div>
            {activeFlyer.social_proof}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activeFlyer.format || 'Feed / Story'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {activeFlyer.cta && (
              <button
                type="button"
                style={{
                  borderRadius: 6,
                  border: '1px solid var(--signal-dim)',
                  background: 'var(--signal-glow)',
                  color: 'var(--signal)',
                  fontSize: 10,
                  padding: '3px 8px',
                  cursor: 'pointer',
                }}
              >
                {activeFlyer.cta}
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isStreaming || isDownloading}
              style={{
                borderRadius: 6,
                border: '1px solid var(--border-bright)',
                background: isStreaming || isDownloading ? 'var(--bg-elevated)' : 'var(--bg-card)',
                color: isStreaming || isDownloading ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontSize: 10,
                padding: '3px 8px',
                cursor: isStreaming || isDownloading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Download the flyer as a zip with image and text"
            >
              <Download size={11} />
              {isDownloading ? 'Downloading' : 'Download zip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
