'use client'

import { useTypingAnimation } from '@/hooks/useTypingAnimation'

interface TypingTextProps {
  text: string
  isStreaming?: boolean
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  style?: React.CSSProperties
  className?: string
}

export function TypingText({
  text,
  isStreaming = false,
  as: Component = 'p',
  style,
  className,
}: TypingTextProps) {
  const displayText = useTypingAnimation({ text, isActive: isStreaming })

  return (
    <Component style={style} className={className}>
      {displayText}
    </Component>
  )
}
