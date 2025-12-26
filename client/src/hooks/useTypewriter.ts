import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTypewriterOptions {
  text: string;
  delay?: number;
  onComplete?: () => void;
  startImmediately?: boolean;
}

interface UseTypewriterReturn {
  displayedText: string;
  isTyping: boolean;
  isComplete: boolean;
  start: () => void;
  reset: () => void;
  skip: () => void;
}

export function useTypewriter({
  text,
  delay = 50,
  onComplete,
  startImmediately = true
}: UseTypewriterOptions): UseTypewriterReturn {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTyping();
    indexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current += 1;
      } else {
        clearTyping();
        setIsTyping(false);
        setIsComplete(true);
        onComplete?.();
      }
    }, delay);
  }, [text, delay, onComplete, clearTyping]);

  const reset = useCallback(() => {
    clearTyping();
    indexRef.current = 0;
    setDisplayedText('');
    setIsTyping(false);
    setIsComplete(false);
  }, [clearTyping]);

  const skip = useCallback(() => {
    clearTyping();
    setDisplayedText(text);
    setIsTyping(false);
    setIsComplete(true);
    onComplete?.();
  }, [text, onComplete, clearTyping]);

  useEffect(() => {
    if (startImmediately && text) {
      start();
    }
    return clearTyping;
  }, [text, startImmediately]);

  useEffect(() => {
    return clearTyping;
  }, [clearTyping]);

  return {
    displayedText,
    isTyping,
    isComplete,
    start,
    reset,
    skip
  };
}

export default useTypewriter;
