import { useState, useEffect } from 'react';

export function useTypewriter(text: string, speed: number = 20, active: boolean = true) {
  const [displayedText, setDisplayedText] = useState(active ? '' : text);
  const [isCompleted, setIsCompleted] = useState(!active);

  useEffect(() => {
    if (!active) {
      setDisplayedText(prev => prev === text ? prev : text);
      setIsCompleted(prev => prev === true ? prev : true);
      return;
    }

    // Only start typing if not already completed or if text changed
    let currentIndex = 0;
    setDisplayedText('');
    setIsCompleted(false);

    const intervalId = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(intervalId);
        setIsCompleted(true);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, active]);

  return { displayedText, isCompleted };
}
