import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { useInfinityRaceProgressStore, PALETTE_COLORS, type ColorPalette } from '../../store/infinityRaceProgressStore';

const PALETTE_NAMES: Record<ColorPalette, string> = {
  default: 'Classic',
  neon_cyan: 'Neon Cyan',
  neon_pink: 'Neon Pink',
  neon_green: 'Neon Green',
  neon_orange: 'Neon Orange',
};

export function PaletteSelector() {
  const { progress, selectPalette } = useInfinityRaceProgressStore();
  
  if (!progress) return null;
  
  const { unlockedPalettes, selectedPalette } = progress;
  const allPalettes: ColorPalette[] = ['default', 'neon_cyan', 'neon_pink', 'neon_green', 'neon_orange'];
  
  return (
    <div 
      className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30"
      data-testid="palette-selector"
    >
      <div className="text-sm text-gray-400 mb-3 flex items-center gap-2">
        <span>🎨</span>
        <span>Color Palette</span>
        {unlockedPalettes.length < allPalettes.length && (
          <span className="text-xs text-cyan-400/70 ml-auto">
            Complete 10 races to unlock
          </span>
        )}
      </div>
      
      <div className="flex gap-2">
        {allPalettes.map(palette => {
          const isUnlocked = unlockedPalettes.includes(palette);
          const isSelected = selectedPalette === palette;
          const colors = PALETTE_COLORS[palette];
          
          return (
            <motion.button
              key={palette}
              whileHover={isUnlocked ? { scale: 1.1 } : undefined}
              whileTap={isUnlocked ? { scale: 0.95 } : undefined}
              onClick={() => isUnlocked && selectPalette(palette)}
              disabled={!isUnlocked}
              className={`relative w-12 h-12 rounded-lg border-2 transition-all ${
                isSelected 
                  ? 'border-white shadow-lg shadow-white/20' 
                  : isUnlocked 
                    ? 'border-gray-600 hover:border-gray-400' 
                    : 'border-gray-800 opacity-50 cursor-not-allowed'
              }`}
              style={{
                background: isUnlocked 
                  ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                  : '#1a1a1a',
              }}
              data-testid={`palette-${palette}`}
              title={PALETTE_NAMES[palette]}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check className="w-5 h-5 text-white drop-shadow-lg" />
                </motion.div>
              )}
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
