import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InitialsEntryProps {
  onSubmit: (initials: string) => void;
  score: number;
  rank?: number | null;
  defaultInitials?: string;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function InitialsEntry({ onSubmit, score, rank, defaultInitials = 'AAA' }: InitialsEntryProps) {
  const [initials, setInitials] = useState<string[]>(
    defaultInitials.toUpperCase().padEnd(3, 'A').split('').slice(0, 3)
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      if (LETTERS.includes(key)) {
        const newInitials = [...initials];
        newInitials[activeIndex] = key;
        setInitials(newInitials);
        if (activeIndex < 2) {
          setActiveIndex(activeIndex + 1);
        }
      } else if (e.key === 'ArrowLeft' && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      } else if (e.key === 'ArrowRight' && activeIndex < 2) {
        setActiveIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        cycleLetter(activeIndex, 1);
      } else if (e.key === 'ArrowDown') {
        cycleLetter(activeIndex, -1);
      } else if (e.key === 'Enter') {
        onSubmit(initials.join(''));
      } else if (e.key === 'Backspace') {
        const newInitials = [...initials];
        newInitials[activeIndex] = 'A';
        setInitials(newInitials);
        if (activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initials, activeIndex, onSubmit]);

  const cycleLetter = (index: number, direction: number) => {
    const currentLetter = initials[index];
    const currentIdx = LETTERS.indexOf(currentLetter);
    const newIdx = (currentIdx + direction + 26) % 26;
    const newInitials = [...initials];
    newInitials[index] = LETTERS[newIdx];
    setInitials(newInitials);
  };

  return (
    <motion.div 
      ref={containerRef}
      className="text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="mb-4">
        {rank && rank <= 10 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
            <p className="text-yellow-400 font-bold text-xl">You placed #{rank}!</p>
          </motion.div>
        ) : (
          <p className="text-gray-400">Great score!</p>
        )}
        <p className="text-3xl font-mono font-bold text-white mt-2" style={{ textShadow: '0 0 20px #00FFFF' }}>
          {score.toLocaleString()}
        </p>
      </div>

      <p className="text-gray-400 text-sm mb-4">Enter your initials</p>

      <div className="flex justify-center gap-3 mb-6">
        {initials.map((letter, idx) => (
          <div key={idx} className="relative">
            <motion.button
              onClick={() => setActiveIndex(idx)}
              className={`w-16 h-20 rounded-lg font-mono text-4xl font-bold flex items-center justify-center transition-all ${
                activeIndex === idx 
                  ? 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-400 shadow-[0_0_20px_#00FFFF50]' 
                  : 'bg-white/10 border-2 border-white/20 text-white hover:border-white/40'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {letter}
            </motion.button>
            
            {activeIndex === idx && (
              <>
                <button
                  onClick={() => cycleLetter(idx, 1)}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 p-1 text-cyan-400 hover:text-cyan-300"
                >
                  <ChevronLeft className="w-6 h-6 rotate-90" />
                </button>
                <button
                  onClick={() => cycleLetter(idx, -1)}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 p-1 text-cyan-400 hover:text-cyan-300"
                >
                  <ChevronRight className="w-6 h-6 rotate-90" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Use arrow keys or tap to change letters
      </p>

      <Button
        onClick={() => onSubmit(initials.join(''))}
        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold px-8"
        data-testid="button-submit-initials"
      >
        <Check className="w-4 h-4 mr-2" />
        Save Score
      </Button>
    </motion.div>
  );
}
