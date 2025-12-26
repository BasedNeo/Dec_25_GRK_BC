import { useTypewriter } from '@/hooks/useTypewriter';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
  delay?: number;
  className?: string;
  cursorClassName?: string;
  onComplete?: () => void;
  showCursor?: boolean;
}

export function TypewriterText({
  text,
  delay = 50,
  className = '',
  cursorClassName = '',
  onComplete,
  showCursor = true
}: TypewriterTextProps) {
  const { displayedText, isTyping, skip } = useTypewriter({
    text,
    delay,
    onComplete,
    startImmediately: true
  });

  return (
    <span 
      className={`relative ${className}`}
      onClick={isTyping ? skip : undefined}
      style={{ cursor: isTyping ? 'pointer' : 'default' }}
      title={isTyping ? 'Click to skip' : undefined}
    >
      {displayedText}
      {showCursor && isTyping && (
        <motion.span
          className={`inline-block w-0.5 h-[1.1em] bg-cyan-400 ml-0.5 align-middle ${cursorClassName}`}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
    </span>
  );
}

export function BlinkingCursor({ className = '' }: { className?: string }) {
  return (
    <motion.span
      className={`inline-block w-0.5 h-[1.1em] bg-cyan-400 ml-0.5 align-middle ${className}`}
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
    />
  );
}

export default TypewriterText;
