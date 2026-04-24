import { useEffect, useState } from 'react'

interface UseTypingAnimationProps {
  text: string
  isActive?: boolean
}

/**
 * Hook for rendering text with typing animation
 * Returns the visible portion of text to display based on animation progress
 */
export function useTypingAnimation({ text, isActive = true }: UseTypingAnimationProps): string {
  const [visibleLength, setVisibleLength] = useState(0)

  useEffect(() => {
    if (!text) {
      setVisibleLength(0)
      return
    }

    if (!isActive) {
      setVisibleLength(text.length)
      return
    }

    // While animating, keep current progress if text only grows; reset if upstream content rewrites.
    setVisibleLength(prev => (text.length >= prev ? prev : 0))
  }, [text, isActive])

  useEffect(() => {
    if (!isActive) return
    if (!text || visibleLength >= text.length) return

    const remaining = text.length - visibleLength
    const step = remaining > 200 ? 8 : remaining > 120 ? 6 : remaining > 60 ? 4 : remaining > 24 ? 2 : 1

    const timer = setTimeout(() => {
      setVisibleLength(current => Math.min(text.length, current + step))
    }, 16)

    return () => clearTimeout(timer)
  }, [text, isActive, visibleLength])

  return isActive ? text.slice(0, visibleLength) : text
}
