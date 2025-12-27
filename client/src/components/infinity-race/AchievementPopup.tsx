import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfinityRaceProgressStore, ACHIEVEMENT_INFO, PALETTE_COLORS, type Achievement, type ColorPalette } from '../../store/infinityRaceProgressStore';

export function AchievementPopup() {
  const { popupQueue, dismissPopup } = useInfinityRaceProgressStore();
  const [visible, setVisible] = useState(false);
  
  const currentPopup = popupQueue[0];
  
  useEffect(() => {
    if (currentPopup) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(dismissPopup, 300);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentPopup, dismissPopup]);
  
  if (!currentPopup) return null;
  
  const renderContent = () => {
    if (currentPopup.type === 'achievement') {
      const achievement = currentPopup.data as Achievement;
      const info = ACHIEVEMENT_INFO[achievement];
      return (
        <div className="text-center">
          <div className="text-5xl mb-3">{info.icon}</div>
          <div className="text-xl font-bold text-cyan-400 mb-1">Achievement Unlocked!</div>
          <div className="text-2xl font-bold text-white mb-1">{info.title}</div>
          <div className="text-sm text-gray-400 mb-2">{info.description}</div>
          {info.brainx > 0 && (
            <div className="text-lg text-purple-400 font-semibold">
              +{info.brainx} BrainX Credits
            </div>
          )}
        </div>
      );
    }
    
    if (currentPopup.type === 'level_up') {
      const level = currentPopup.data as number;
      const statBonus = level - 1;
      return (
        <div className="text-center">
          <div className="text-5xl mb-3">⬆️</div>
          <div className="text-xl font-bold text-yellow-400 mb-1">Level Up!</div>
          <div className="text-4xl font-bold text-white mb-2">Level {level}</div>
          <div className="text-sm text-gray-400">
            All craft stats get +{statBonus} bonus
          </div>
        </div>
      );
    }
    
    if (currentPopup.type === 'palette_unlock') {
      const palettes = currentPopup.data as ColorPalette[];
      return (
        <div className="text-center">
          <div className="text-5xl mb-3">🎨</div>
          <div className="text-xl font-bold text-green-400 mb-2">Palettes Unlocked!</div>
          <div className="flex gap-3 justify-center mb-2">
            {palettes.map(p => (
              <div 
                key={p} 
                className="w-8 h-8 rounded-full border-2 border-white/50"
                style={{ backgroundColor: PALETTE_COLORS[p].primary }}
              />
            ))}
          </div>
          <div className="text-sm text-gray-400">Select in the craft menu</div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50"
          data-testid="achievement-popup"
        >
          <div className="bg-black/90 backdrop-blur-md border-2 border-cyan-500/50 rounded-xl p-6 shadow-2xl shadow-cyan-500/20 min-w-[300px]">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
