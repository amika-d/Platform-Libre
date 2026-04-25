import React, { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface StreamResponseCardProps {
  text: string
  isStreaming?: boolean
  sourceDetails?: Array<{ id: string; domain: string; url: string }>
  isThinking?: boolean
}

interface StreamPayload {
  node?: string
  action?: string
  text?: string
  done?: boolean
}

function extractLeadingJsonObject(input: string): string | null {
  const source = input.trim()
  if (!source.startsWith('{')) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(0, i + 1)
      }
    }
  }

  return null
}

function parseLinePayload(payload: string): string {
  const trimmed = payload.trim()
  if (!trimmed || trimmed === '[DONE]') return ''

  const jsonCandidate = extractLeadingJsonObject(trimmed)
  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate) as StreamPayload
      if (parsed.done) return ''
      if (typeof parsed.text === 'string') return parsed.text.trim()
      return ''
    } catch {
      return trimmed.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    }
  }

  return trimmed.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
}

export function extractStreamDisplayText(rawText: string): string {
  const normalized = rawText.replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''

  const lines = normalized.split('\n')
  const fragments: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === ': ping') continue

    if (trimmed.startsWith('data:')) {
      const parsed = parseLinePayload(trimmed.slice(5))
      if (parsed) fragments.push(parsed)
      continue
    }

    const parsed = parseLinePayload(trimmed)
    if (parsed) fragments.push(parsed)
  }

  return fragments.join('\n\n').trim()
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function formatStructuredResponse(text: string): string {
  if (!text.trim()) return ''

  return text
    // Keep bold section labels on their own line.
    .replace(/(\*\*[^*\n]+:\*\*)\s+/g, '$1\n')
    // Break inline numbered lists into separate lines.
    .replace(/\s+(?=\d+\.\s+)/g, '\n')
    // Break inline dash bullets into separate lines.
    .replace(/\s+(?=-\s+[A-Za-z(])/g, '\n')
    // Keep explicit section prompts readable.
    .replace(/\s+(?=Would you like me to:)/gi, '\n\n')
    // Normalize excessive whitespace while preserving paragraph gaps.
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function StreamResponseCard({ text, isStreaming = false, sourceDetails, isThinking = false }: StreamResponseCardProps) {
  const cleaned = extractStreamDisplayText(text)
  const [visibleLength, setVisibleLength] = useState(0)

  useEffect(() => {
    if (!cleaned) {
      setVisibleLength(0)
      return
    }

    if (!isStreaming) {
      setVisibleLength(cleaned.length)
      return
    }

    // While streaming, keep current progress if text only grows; reset if upstream content rewrites.
    setVisibleLength(prev => (cleaned.length >= prev ? prev : 0))
  }, [cleaned, isStreaming])

  useEffect(() => {
    if (!isStreaming) return
    if (!cleaned || visibleLength >= cleaned.length) return

    const remaining = cleaned.length - visibleLength
    const step = remaining > 200 ? 8 : remaining > 120 ? 6 : remaining > 60 ? 4 : remaining > 24 ? 2 : 1

    const timer = setTimeout(() => {
      setVisibleLength(current => Math.min(cleaned.length, current + step))
    }, 16)

    return () => clearTimeout(timer)
  }, [cleaned, isStreaming, visibleLength])

  const typedText = isStreaming ? cleaned.slice(0, visibleLength) : cleaned
  const formattedText = formatStructuredResponse(typedText)
  const sections = formattedText ? formattedText.split(/\n{2,}/) : []

  if (sections.length === 0) return null

  return (
      <div
        style={{
          borderRadius: 10,
          border: '1px solid var(--border-bright)',
          background: isThinking ? 'var(--bg-elevated)' : 'var(--bg-card)',
          padding: '12px 14px',
          fontStyle: isThinking ? 'italic' : 'normal',
          opacity: isThinking ? 0.85 : 1,
        }}
      >
        {sections.map((section, sectionIndex) => {
        const lines = section.split('\n').map(line => line.trim()).filter(Boolean)
        const heading = lines.length === 1 ? lines[0].match(/^(#{1,3})\s+(.+)$/) : null
        const isOrderedList = lines.length > 0 && lines.every(line => /^\d+\.\s+/.test(line))
        const isUnorderedList = lines.length > 0 && lines.every(line => /^[-*]\s+/.test(line))

        if (heading) {
          const [, marks, title] = heading
          const level = marks.length
          const size = level === 1 ? 16 : level === 2 ? 15 : 14
          return (
            <p
              key={`h-${sectionIndex}`}
              style={{
                margin: sectionIndex === sections.length - 1 ? 0 : '0 0 10px 0',
                color: 'var(--text-primary)',
                fontSize: size,
                lineHeight: 1.4,
                fontWeight: 600,
              }}
            >
              {renderInlineMarkdown(title)}
            </p>
          )
        }

        if (isOrderedList) {
          return (
            <ol
              key={`list-${sectionIndex}`}
              style={{
                margin: sectionIndex === 0 ? '0 0 8px 0' : '6px 0 8px 0',
                paddingLeft: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              {lines.map((line, itemIndex) => {
                const listText = line.replace(/^\d+\.\s+/, '')
                return <li key={`item-${sectionIndex}-${itemIndex}`}>{renderInlineMarkdown(listText)}</li>
              })}
            </ol>
          )
        }

        if (isUnorderedList) {
          return (
            <ul
              key={`ul-${sectionIndex}`}
              style={{
                margin: sectionIndex === 0 ? '0 0 8px 0' : '6px 0 8px 0',
                paddingLeft: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              {lines.map((line, itemIndex) => {
                const listText = line.replace(/^[-*]\s+/, '')
                return <li key={`uitem-${sectionIndex}-${itemIndex}`}>{renderInlineMarkdown(listText)}</li>
              })}
            </ul>
          )
        }

        return (
          <p
            key={`p-${sectionIndex}`}
            style={{
              margin: sectionIndex === sections.length - 1 ? 0 : '0 0 10px 0',
              color: 'var(--text-secondary)',
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {renderInlineMarkdown(section)}
          </p>
        )
      })}

      {isStreaming && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            color: 'var(--text-muted)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span>streaming</span>
          <span style={{ color: 'var(--signal)', opacity: 0.75 }}>|</span>
          <span
            className="typing-dot"
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--signal)', animationDelay: '0ms' }}
          />
          <span
            className="typing-dot"
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--signal)', animationDelay: '120ms' }}
          />
          <span
            className="typing-dot"
            style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--signal)', animationDelay: '240ms' }}
          />
        </div>
      )}

      {/* Sources Section */}
      {!isStreaming && sourceDetails && sourceDetails.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Sources
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sourceDetails.map((source, idx) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  border: '1px solid var(--border-bright)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 10px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                className="source-tag"
              >
                <span style={{ opacity: 0.5 }}>[{idx + 1}]</span>
                <span>{source.domain}</span>
                <ExternalLink size={10} style={{ opacity: 0.6 }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

