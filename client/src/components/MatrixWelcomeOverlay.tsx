import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MatrixWelcomeOverlayProps {
  isFirstVisit: boolean;
  onComplete: () => void;
  prefersReducedMotion?: boolean;
}

const GREETING_OPTIONS = [
  'Wake up, Guardian...',
  'Welcome back, Guardian...',
  "What's up, Guardian...",
  'Get ready, Guardian...',
];

const GREETING_INDEX_KEY = 'guardian_greeting_index';

function getNextGreetingIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const storedIndex = localStorage.getItem(GREETING_INDEX_KEY);
    const lastIndex = storedIndex ? parseInt(storedIndex, 10) : -1;
    if (isNaN(lastIndex)) return 0;
    return (lastIndex + 1) % GREETING_OPTIONS.length;
  } catch {
    return 0;
  }
}

function saveGreetingIndex(index: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GREETING_INDEX_KEY, index.toString());
  } catch {
  }
}

export function MatrixWelcomeOverlay({ 
  isFirstVisit, 
  onComplete,
  prefersReducedMotion = false 
}: MatrixWelcomeOverlayProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  
  const greetingIndexRef = useRef<number | null>(null);
  
  const greeting = useMemo(() => {
    if (greetingIndexRef.current === null) {
      greetingIndexRef.current = getNextGreetingIndex();
      saveGreetingIndex(greetingIndexRef.current);
    }
    return GREETING_OPTIONS[greetingIndexRef.current];
  }, []);

  const lines = useMemo(() => {
    if (isFirstVisit) {
      return [
        { text: greeting, delay: 1000, slow: true },
        { text: '', delay: 1400 },
        { text: 'Based Guardians Command Center', delay: 700 },
        { text: 'Beta Phase Active', delay: 500 },
        { text: '', delay: 900 },
        { text: 'Your journey into the Based Universe awaits.', delay: 700 },
      ];
    }
    return [
      { text: greeting, delay: 1000, slow: true },
      { text: '', delay: 1200 },
      { text: 'The Command Center awaits.', delay: 600 },
    ];
  }, [isFirstVisit, greeting]);

  const handleSkip = useCallback(() => {
    setIsExiting(true);
    setTimeout(onComplete, 800);
  }, [onComplete]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedLines(lines.map(l => l.text));
      setIsTyping(false);
      setTimeout(handleSkip, 2000);
      return;
    }

    if (currentLineIndex >= lines.length) {
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(onComplete, 1000);
      }, 1500);
      return;
    }

    const line = lines[currentLineIndex];
    
    if (line.text === '') {
      setDisplayedLines(prev => [...prev, '']);
      setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1);
      }, line.delay);
      return;
    }

    let charIndex = 0;
    setCurrentText('');
    setIsTyping(true);

    const isSlow = 'slow' in line && line.slow;
    const speed = prefersReducedMotion ? 5 : (isSlow ? 80 : 45);

    const typeInterval = setInterval(() => {
      if (charIndex < line.text.length) {
        setCurrentText(line.text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setDisplayedLines(prev => [...prev, line.text]);
        setCurrentText('');
        setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
        }, line.delay);
      }
    }, speed);

    return () => clearInterval(typeInterval);
  }, [currentLineIndex, lines, prefersReducedMotion, onComplete, handleSkip]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center cursor-pointer"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          onClick={handleSkip}
          data-testid="matrix-welcome-overlay"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
          </div>

          <div className="relative z-10 max-w-2xl w-full px-8 md:px-12">
            <div className="space-y-4 font-mono">
              {displayedLines.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`${
                    index === 0 
                      ? 'text-2xl md:text-4xl text-cyan-400 font-bold tracking-wider' 
                      : line === 'Beta Phase Active'
                        ? 'text-sm md:text-base text-amber-400/80 tracking-[0.3em] uppercase'
                        : 'text-sm md:text-lg text-white/60 tracking-wide'
                  }`}
                >
                  {line || <span className="opacity-0">.</span>}
                </motion.div>
              ))}
              
              {isTyping && currentText && (
                <div className={`${
                  currentLineIndex === 0 
                    ? 'text-2xl md:text-4xl text-cyan-400 font-bold tracking-wider' 
                    : lines[currentLineIndex]?.text === 'Beta Phase Active'
                      ? 'text-sm md:text-base text-amber-400/80 tracking-[0.3em] uppercase'
                      : 'text-sm md:text-lg text-white/60 tracking-wide'
                }`}>
                  {currentText}
                  <span className={`inline-block w-[2px] h-[1em] ml-1 align-middle ${
                    showCursor ? 'bg-current' : 'bg-transparent'
                  }`} />
                </div>
              )}

              {!isTyping && currentLineIndex < lines.length && (
                <span className={`inline-block w-[2px] h-5 ${
                  showCursor ? 'bg-cyan-400' : 'bg-transparent'
                }`} />
              )}
            </div>
          </div>

          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20 text-xs tracking-[0.3em] uppercase font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            Click or press any key to continue
          </motion.div>

          <div className="absolute top-6 right-6">
            <motion.div 
              className="text-white/10 text-[10px] font-mono tracking-widest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              BASED://COMMAND.CENTER
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
