import { motion } from 'framer-motion';
import { Lock, Check, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  useUnlockables, 
  SHIP_SKINS, ShipSkin,
  RING_THEMES, RingTheme,
  TERMINAL_SKINS, TerminalSkin
} from '@/hooks/useUnlockables';

interface ShipSelectorProps {
  onSelect: (skin: ShipSkin) => void;
  onClose: () => void;
}

export function ShipSelector({ onSelect, onClose }: ShipSelectorProps) {
  const { selected, selectShip, isShipUnlocked } = useUnlockables();
  const skins = Object.entries(SHIP_SKINS) as [ShipSkin, typeof SHIP_SKINS[ShipSkin]][];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <Card className="bg-black/80 border-purple-500/30 p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-orbitron font-bold text-white">Select Your Ship</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {skins.map(([id, skin]) => {
            const unlocked = isShipUnlocked(id);
            const isSelected = selected.ship === id;
            
            return (
              <motion.button
                key={id}
                onClick={() => {
                  if (unlocked) {
                    selectShip(id);
                    onSelect(id);
                  }
                }}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? 'border-purple-500 bg-purple-500/20' 
                    : unlocked 
                      ? 'border-white/20 hover:border-white/40 bg-white/5' 
                      : 'border-gray-700 bg-gray-900/50 cursor-not-allowed'
                }`}
                whileHover={unlocked ? { scale: 1.02 } : {}}
                whileTap={unlocked ? { scale: 0.98 } : {}}
                data-testid={`ship-${id}`}
              >
                <div className="flex flex-col items-center">
                  <div 
                    className="w-16 h-16 mb-3 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: unlocked ? skin.colors.primary + '30' : '#333',
                      boxShadow: unlocked ? `0 0 20px ${skin.colors.glow}40` : 'none'
                    }}
                  >
                    {unlocked ? (
                      <div 
                        className="w-8 h-8 rounded-sm rotate-45"
                        style={{ backgroundColor: skin.colors.primary }}
                      />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  
                  <p className={`font-bold ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                    {unlocked ? skin.name : '???'}
                  </p>
                  <p className={`text-xs ${unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                    {unlocked ? skin.description : skin.unlockRequirement}
                  </p>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
        
        <Button 
          onClick={onClose} 
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500"
          data-testid="button-confirm-ship"
        >
          Confirm Selection
        </Button>
      </Card>
    </motion.div>
  );
}

interface RingThemeSelectorProps {
  onSelect: (theme: RingTheme) => void;
  onClose: () => void;
}

export function RingThemeSelector({ onSelect, onClose }: RingThemeSelectorProps) {
  const { selected, selectRingTheme, isThemeUnlocked } = useUnlockables();
  const themes = Object.entries(RING_THEMES) as [RingTheme, typeof RING_THEMES[RingTheme]][];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <Card className="bg-black/80 border-cyan-500/30 p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-cyan-400" />
          <h2 className="text-2xl font-orbitron font-bold text-white">Select Ring Theme</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {themes.map(([id, theme]) => {
            const unlocked = isThemeUnlocked(id);
            const isSelected = selected.ringTheme === id;
            
            return (
              <motion.button
                key={id}
                onClick={() => {
                  if (unlocked) {
                    selectRingTheme(id);
                    onSelect(id);
                  }
                }}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? 'border-cyan-500 bg-cyan-500/20' 
                    : unlocked 
                      ? 'border-white/20 hover:border-white/40 bg-white/5' 
                      : 'border-gray-700 bg-gray-900/50 cursor-not-allowed'
                }`}
                whileHover={unlocked ? { scale: 1.02 } : {}}
                whileTap={unlocked ? { scale: 0.98 } : {}}
                data-testid={`theme-${id}`}
              >
                <div className="flex flex-col items-center">
                  <div 
                    className="w-16 h-16 mb-3 rounded-full flex items-center justify-center border-4"
                    style={{ 
                      borderColor: unlocked ? theme.colors.ring1 : '#444',
                      backgroundColor: unlocked ? theme.colors.bg : '#1a1a1a',
                      boxShadow: unlocked ? `0 0 15px ${theme.colors.ring1}40, inset 0 0 15px ${theme.colors.ring2}20` : 'none'
                    }}
                  >
                    {unlocked ? (
                      <div 
                        className="w-6 h-6 rounded-full border-2"
                        style={{ borderColor: theme.colors.ring2 }}
                      />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  
                  <p className={`font-bold ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                    {unlocked ? theme.name : '???'}
                  </p>
                  <p className={`text-xs ${unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                    {unlocked ? theme.description : theme.unlockRequirement}
                  </p>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
        
        <Button 
          onClick={onClose} 
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
          data-testid="button-confirm-theme"
        >
          Confirm Selection
        </Button>
      </Card>
    </motion.div>
  );
}

interface TerminalSelectorProps {
  onSelect: (terminal: TerminalSkin) => void;
  onClose: () => void;
}

export function TerminalSelector({ onSelect, onClose }: TerminalSelectorProps) {
  const { selected, selectTerminal, isTerminalUnlocked } = useUnlockables();
  const terminals = Object.entries(TERMINAL_SKINS) as [TerminalSkin, typeof TERMINAL_SKINS[TerminalSkin]][];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <Card className="bg-black/80 border-green-500/30 p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-green-400" />
          <h2 className="text-2xl font-orbitron font-bold text-white">Select Terminal Skin</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {terminals.map(([id, terminal]) => {
            const unlocked = isTerminalUnlocked(id);
            const isSelected = selected.terminal === id;
            
            return (
              <motion.button
                key={id}
                onClick={() => {
                  if (unlocked) {
                    selectTerminal(id);
                    onSelect(id);
                  }
                }}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? 'border-green-500 bg-green-500/20' 
                    : unlocked 
                      ? 'border-white/20 hover:border-white/40 bg-white/5' 
                      : 'border-gray-700 bg-gray-900/50 cursor-not-allowed'
                }`}
                whileHover={unlocked ? { scale: 1.02 } : {}}
                whileTap={unlocked ? { scale: 0.98 } : {}}
                data-testid={`terminal-${id}`}
              >
                <div className="flex flex-col items-center">
                  <div 
                    className="w-16 h-12 mb-3 rounded flex items-center justify-center font-mono text-xs"
                    style={{ 
                      backgroundColor: unlocked ? terminal.colors.bg : '#1a1a1a',
                      color: unlocked ? terminal.colors.text : '#444',
                      border: `1px solid ${unlocked ? terminal.colors.accent : '#333'}`,
                      textShadow: unlocked ? `0 0 5px ${terminal.colors.glow}` : 'none'
                    }}
                  >
                    {unlocked ? '>_' : <Lock className="w-4 h-4 text-gray-500" />}
                  </div>
                  
                  <p className={`font-bold ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                    {unlocked ? terminal.name : '???'}
                  </p>
                  <p className={`text-xs ${unlocked ? 'text-gray-400' : 'text-gray-600'}`}>
                    {unlocked ? terminal.description : terminal.unlockRequirement}
                  </p>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
        
        <Button 
          onClick={onClose} 
          className="w-full bg-gradient-to-r from-green-500 to-cyan-500"
          data-testid="button-confirm-terminal"
        >
          Confirm Selection
        </Button>
      </Card>
    </motion.div>
  );
}
