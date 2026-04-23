'use client';

import React from 'react';
import { useTypewriter } from '@/hooks/use-typewriter';
import { MarkdownRenderer } from './markdown-renderer';

interface TypewriterRendererProps {
  content: string;
  speed?: number;
  active?: boolean;
  onComplete?: () => void;
}

export function TypewriterRenderer({ content, speed = 8, active = true, onComplete }: TypewriterRendererProps) {
  const { displayedText, isCompleted } = useTypewriter(content, speed, active);

  const hasNotifiedRef = React.useRef(false);

  React.useEffect(() => {
    if (isCompleted && onComplete && !hasNotifiedRef.current) {
      onComplete();
      hasNotifiedRef.current = true;
    }
  }, [isCompleted, onComplete]);

  // Reset notification flag if content changes
  React.useEffect(() => {
    hasNotifiedRef.current = false;
  }, [content]);

  return <MarkdownRenderer content={displayedText} />;
}
