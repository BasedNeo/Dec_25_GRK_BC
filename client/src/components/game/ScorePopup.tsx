import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';

interface ScorePopupItem {
  id: number;
  value: number;
  x: number;
  y: number;
  type: 'score' | 'combo' | 'bonus' | 'perfect' | 'miss';
  multiplier?: number;
}

interface ScorePopupManagerProps {
  containerRef?: React.RefObject<HTMLElement>;
}

let globalPopupId = 0;

export function useScorePopups() {
  const [popups, setPopups] = useState<ScorePopupItem[]>([]);
  const containerRef = useRef<HTMLElement | null>(null);

  const addPopup = useCallback((
    value: number,
    x: number,
    y: number,
    type: ScorePopupItem['type'] = 'score',
    multiplier?: number
  ) => {
    const id = ++globalPopupId;
    const popup: ScorePopupItem = { id, value, x, y, type, multiplier };
    
    setPopups(prev => [...prev, popup]);
    
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  }, []);

  const addScorePopup = useCallback((value: number, x: number, y: number) => {
    addPopup(value, x, y, 'score');
  }, [addPopup]);

  const addComboPopup = useCallback((value: number, combo: number, x: number, y: number) => {
    addPopup(value, x, y, 'combo', combo);
  }, [addPopup]);

  const addPerfectPopup = useCallback((x: number, y: number) => {
    addPopup(0, x, y, 'perfect');
  }, [addPopup]);

  const addBonusPopup = useCallback((value: number, x: number, y: number) => {
    addPopup(value, x, y, 'bonus');
  }, [addPopup]);

  const addMissPopup = useCallback((x: number, y: number) => {
    addPopup(0, x, y, 'miss');
  }, [addPopup]);

  const setContainer = useCallback((ref: HTMLElement | null) => {
    containerRef.current = ref;
  }, []);

  return {
    popups,
    addScorePopup,
    addComboPopup,
    addPerfectPopup,
    addBonusPopup,
    addMissPopup,
    setContainer,
    containerRef,
  };
}

const getPopupConfig = (type: ScorePopupItem['type']) => {
  switch (type) {
    case 'perfect':
      return {
        text: 'PERFECT!',
        gradient: 'from-yellow-400 via-orange-400 to-pink-500',
        glow: 'shadow-yellow-500/50',
        scale: 1.5,
      };
    case 'combo':
      return {
        gradient: 'from-purple-400 via-pink-400 to-red-400',
        glow: 'shadow-purple-500/50',
        scale: 1.3,
      };
    case 'bonus':
      return {
        gradient: 'from-green-400 via-emerald-400 to-cyan-400',
        glow: 'shadow-green-500/50',
        scale: 1.2,
      };
    case 'miss':
      return {
        text: 'MISS',
        gradient: 'from-red-500 to-red-700',
        glow: 'shadow-red-500/50',
        scale: 1.0,
      };
    default:
      return {
        gradient: 'from-cyan-400 to-blue-400',
        glow: 'shadow-cyan-500/50',
        scale: 1.0,
      };
  }
};

export function ScorePopupContainer({ popups }: { popups: ScorePopupItem[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {popups.map((popup) => {
          const config = getPopupConfig(popup.type);
          
          let displayText = '';
          if (popup.type === 'perfect' || popup.type === 'miss') {
            displayText = config.text || '';
          } else if (popup.type === 'combo' && popup.multiplier) {
            displayText = `+${popup.value} x${popup.multiplier}`;
          } else {
            displayText = popup.value >= 0 ? `+${popup.value}` : `${popup.value}`;
          }
          
          return (
            <motion.div
              key={popup.id}
              initial={{ 
                opacity: 0, 
                scale: 0.5,
                x: popup.x,
                y: popup.y,
              }}
              animate={{ 
                opacity: 1, 
                scale: config.scale,
                x: popup.x + (Math.random() - 0.5) * 20,
                y: popup.y - 40,
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.3,
                y: popup.y - 100,
              }}
              transition={{ 
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute pointer-events-none"
              style={{ left: 0, top: 0 }}
            >
              <span 
                className={`
                  text-2xl font-black font-orbitron
                  text-transparent bg-clip-text bg-gradient-to-r ${config.gradient}
                  drop-shadow-lg ${config.glow}
                  whitespace-nowrap
                `}
                style={{
                  textShadow: '0 0 20px currentColor, 0 0 40px currentColor',
                }}
              >
                {displayText}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ScreenShake({ 
  intensity = 0, 
  children 
}: { 
  intensity: number; 
  children: React.ReactNode;
}) {
  const [shake, setShake] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    if (intensity <= 0) {
      setShake({ x: 0, y: 0 });
      return;
    }
    
    const interval = setInterval(() => {
      setShake({
        x: (Math.random() - 0.5) * intensity * 2,
        y: (Math.random() - 0.5) * intensity * 2,
      });
    }, 16);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setShake({ x: 0, y: 0 });
    }, 150);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [intensity]);
  
  return (
    <div style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
      {children}
    </div>
  );
}

export function useScreenShake() {
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const triggerShake = useCallback((intensity: number = 5, duration: number = 150) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setShakeIntensity(intensity);
    
    timeoutRef.current = setTimeout(() => {
      setShakeIntensity(0);
    }, duration);
  }, []);
  
  const lightShake = useCallback(() => triggerShake(3, 100), [triggerShake]);
  const mediumShake = useCallback(() => triggerShake(5, 150), [triggerShake]);
  const heavyShake = useCallback(() => triggerShake(10, 200), [triggerShake]);
  
  return {
    shakeIntensity,
    triggerShake,
    lightShake,
    mediumShake,
    heavyShake,
  };
}
