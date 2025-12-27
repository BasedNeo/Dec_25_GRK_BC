import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCreatureAbilitiesStore } from '@/store/creatureAbilitiesStore';
import { 
  AbilityId, 
  ABILITY_LEVEL_EFFECTS,
  ABILITY_DEFINITIONS,
  getAbilityList,
  getUpgradeCost,
} from '@/shared/creatureAbilities';
import { Star, ChevronUp, ChevronDown, Zap } from 'lucide-react';

interface MobileCreatureAbilityPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function MobileCreatureAbilityPanel({ isExpanded, onToggle }: MobileCreatureAbilityPanelProps) {
  const [selectedCreature, setSelectedCreature] = useState<AbilityId>('rapid_fire');
  const { 
    abilityLevels, 
    totalPoints, 
    sessionPoints,
    upgradeAbility,
  } = useCreatureAbilitiesStore();
  
  const abilities = getAbilityList();
  const selectedAbility = ABILITY_DEFINITIONS[selectedCreature];
  const selectedLevel = abilityLevels[selectedCreature];
  const selectedNextCost = getUpgradeCost(selectedLevel);
  const selectedCanUpgrade = selectedLevel < selectedAbility.maxLevel && totalPoints >= selectedNextCost;
  const selectedIsMaxed = selectedLevel >= selectedAbility.maxLevel;
  const selectedLevelEffect = ABILITY_LEVEL_EFFECTS[selectedCreature][selectedLevel - 1];
  const nextLevelEffect = ABILITY_LEVEL_EFFECTS[selectedCreature][selectedLevel];
  
  const handleUpgrade = (abilityId: AbilityId) => {
    upgradeAbility(abilityId);
  };
  
  return (
    <div 
      className="bg-black/95 border-t-2 border-cyan-500/50 backdrop-blur-md"
      data-testid="mobile-creature-ability-panel"
    >
      {/* Toggle Header - Always visible, 60px+ touch target */}
      <button
        onClick={onToggle}
        className="w-full h-[60px] min-h-[60px] flex items-center justify-between px-4 active:bg-white/5"
        data-testid="toggle-ability-panel"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-cyan-400">Creature Abilities</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-400 font-mono font-bold" data-testid="mobile-total-points">
              {totalPoints} pts
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Horizontal Scrollable Ability Buttons - Touch friendly 60px+ */}
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
                {abilities.map((ability) => {
                  const level = abilityLevels[ability.id];
                  const isSelected = selectedCreature === ability.id;
                  
                  return (
                    <button
                      key={ability.id}
                      className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[70px] h-[70px] rounded-xl transition-all active:scale-95 ${
                        isSelected 
                          ? 'bg-cyan-600 border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                          : 'bg-gray-900/80 border-2 border-gray-700 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedCreature(ability.id)}
                      data-testid={`mobile-creature-${ability.id}`}
                    >
                      <span className="text-2xl mb-1">{ability.icon}</span>
                      <span 
                        className="text-[10px] font-medium leading-tight"
                        style={{ color: isSelected ? 'white' : ability.color }}
                      >
                        {ability.creatureName.split(' ')[0]}
                      </span>
                      {level > 0 && (
                        <span className="text-[9px] bg-purple-500/70 px-1.5 rounded mt-0.5">
                          L{level}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Selected Ability Details - Compact */}
              <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedAbility.icon}</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color: selectedAbility.color }}>
                        {selectedAbility.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Level {selectedLevel}/{selectedAbility.maxLevel}
                      </div>
                    </div>
                  </div>
                  
                  {/* Level Progress Dots */}
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`w-3 h-3 rounded-full ${
                          level <= selectedLevel
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                            : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Effect Description - Compact */}
                <div className="text-[11px] text-gray-400 mb-3 leading-tight">
                  {selectedLevel > 0 && selectedLevelEffect ? (
                    <span className="text-green-400">{selectedLevelEffect.description}</span>
                  ) : (
                    <span>{selectedAbility.description}</span>
                  )}
                </div>
                
                {/* Upgrade Button - 60px+ touch target */}
                <Button
                  className={`w-full h-[60px] min-h-[60px] text-base font-bold rounded-xl active:scale-95 transition-transform ${
                    selectedIsMaxed 
                      ? 'bg-purple-900/50 text-purple-400' 
                      : selectedCanUpgrade 
                        ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_20px_rgba(0,255,255,0.3)]' 
                        : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
                  }`}
                  disabled={!selectedCanUpgrade}
                  onClick={() => handleUpgrade(selectedCreature)}
                  data-testid="mobile-upgrade-btn"
                >
                  {selectedIsMaxed ? (
                    '✓ MAXED'
                  ) : selectedLevel === 0 ? (
                    `Unlock (${selectedNextCost} pts)`
                  ) : selectedCanUpgrade ? (
                    `Upgrade to L${selectedLevel + 1} (${selectedNextCost} pts)`
                  ) : (
                    `Need ${selectedNextCost} pts`
                  )}
                </Button>
              </div>
              
              {/* Session info */}
              <div className="text-center text-[10px] text-gray-500">
                Session: +{sessionPoints} pts | Earn 20 base + 50/stage
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
