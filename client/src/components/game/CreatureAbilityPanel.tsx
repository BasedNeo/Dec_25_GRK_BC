import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreatureAbilitiesStore } from '@/store/creatureAbilitiesStore';
import { 
  AbilityId, 
  ABILITY_LEVEL_EFFECTS,
  ABILITY_DEFINITIONS,
  getAbilityList,
  getUpgradeCost,
} from '@/shared/creatureAbilities';
import { ChevronUp, Star, Zap, Info } from 'lucide-react';

export function CreatureAbilityPanel() {
  const [expanded, setExpanded] = useState(false);
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
    <Card 
      className="bg-black/80 border-cyan-500/50 backdrop-blur-sm"
      data-testid="creature-ability-panel"
    >
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-cyan-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Creature Abilities
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-yellow-400 font-mono" data-testid="total-points">
                {totalPoints} pts
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-cyan-400"
              onClick={() => setExpanded(!expanded)}
              data-testid="toggle-abilities-panel"
            >
              <ChevronUp className={`w-4 h-4 transition-transform ${expanded ? '' : 'rotate-180'}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="py-2 px-3 space-y-3">
          <div className="flex gap-1 flex-wrap justify-center">
            {abilities.map((ability) => {
              const level = abilityLevels[ability.id];
              const isSelected = selectedCreature === ability.id;
              
              return (
                <Button
                  key={ability.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`h-8 px-2 text-xs ${
                    isSelected 
                      ? 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400' 
                      : 'border-gray-600 hover:border-gray-500 bg-gray-900/50'
                  }`}
                  onClick={() => setSelectedCreature(ability.id)}
                  data-testid={`creature-selector-${ability.id}`}
                >
                  <span className="mr-1">{ability.icon}</span>
                  <span style={{ color: isSelected ? 'white' : ability.color }}>
                    {ability.creatureName}
                  </span>
                  {level > 0 && (
                    <span className="ml-1 text-[9px] bg-purple-500/50 px-1 rounded">
                      L{level}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
          
          <div className="p-3 rounded-lg bg-gray-900/70 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedAbility.icon}</span>
                <div>
                  <div className="font-bold text-sm" style={{ color: selectedAbility.color }}>
                    {selectedAbility.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {selectedAbility.creatureName} Creature
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Level</div>
                <div className="font-mono text-lg text-cyan-400">
                  {selectedLevel}/{selectedAbility.maxLevel}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    level <= selectedLevel
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                      : 'bg-gray-700'
                  }`}
                  data-testid={`selected-level-${level}`}
                />
              ))}
            </div>
            
            <div className="mb-3 p-2 rounded bg-gray-800/50 border border-gray-700">
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  {selectedLevel > 0 && selectedLevelEffect ? (
                    <div>
                      <span className="text-green-400 font-medium">Current: </span>
                      <span className="text-gray-300">{selectedLevelEffect.description}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">{selectedAbility.description}</span>
                  )}
                  {!selectedIsMaxed && nextLevelEffect && (
                    <div className="mt-1">
                      <span className="text-yellow-400 font-medium">Next: </span>
                      <span className="text-gray-400">{nextLevelEffect.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              size="sm"
              variant={selectedIsMaxed ? "secondary" : selectedCanUpgrade ? "default" : "outline"}
              className={`w-full h-8 text-sm font-medium ${
                selectedIsMaxed 
                  ? 'bg-purple-900/50 text-purple-400 cursor-default' 
                  : selectedCanUpgrade 
                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white' 
                    : 'border-gray-600 text-gray-500'
              }`}
              disabled={!selectedCanUpgrade}
              onClick={() => handleUpgrade(selectedCreature)}
              data-testid="upgrade-selected-btn"
            >
              {selectedIsMaxed ? (
                '✓ MAXED OUT'
              ) : selectedCanUpgrade ? (
                <>
                  Upgrade to Level {selectedLevel + 1} ({selectedNextCost} pts)
                </>
              ) : (
                <>
                  Need {selectedNextCost} pts (have {totalPoints})
                </>
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800">
            <span>Earn 10 pts base + combo bonus per wave</span>
            <span className="text-cyan-400">Session: +{sessionPoints} pts</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
