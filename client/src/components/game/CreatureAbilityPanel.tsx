import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCreatureAbilitiesStore } from '@/store/creatureAbilitiesStore';
import { 
  AbilityId, 
  ABILITY_DEFINITIONS, 
  ABILITY_LEVEL_EFFECTS,
  getAbilityList,
} from '@/shared/creatureAbilities';
import { ChevronUp, Coins, Zap } from 'lucide-react';

export function CreatureAbilityPanel() {
  const [expanded, setExpanded] = useState(false);
  const { 
    abilityLevels, 
    basedBalance, 
    points,
    upgradeAbility,
    selectedAbility,
    setSelectedAbility,
  } = useCreatureAbilitiesStore();
  
  const abilities = getAbilityList();
  
  const handleUpgrade = (abilityId: AbilityId) => {
    const success = upgradeAbility(abilityId);
    if (success) {
      setSelectedAbility(abilityId);
    }
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
            Guardian Abilities
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <Coins className="w-3 h-3 text-yellow-500" />
              <span className="text-yellow-400 font-mono" data-testid="based-balance">
                {basedBalance} $BASED
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
        <CardContent className="py-2 px-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {abilities.map((ability) => {
              const currentLevel = abilityLevels[ability.id];
              const canUpgrade = currentLevel < ability.maxLevel && basedBalance >= ability.costPerLevel;
              const isMaxed = currentLevel >= ability.maxLevel;
              const isSelected = selectedAbility === ability.id;
              const levelEffect = ABILITY_LEVEL_EFFECTS[ability.id][currentLevel - 1];
              
              return (
                <div
                  key={ability.id}
                  className={`p-2 rounded-lg border transition-all ${
                    isSelected 
                      ? 'border-cyan-400 bg-cyan-900/20' 
                      : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                  }`}
                  data-testid={`ability-card-${ability.id}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{ability.icon}</span>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: ability.color }}>
                          {ability.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          #{ability.creatureNumber} {ability.creatureName}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-1.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            level <= currentLevel
                              ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                              : 'bg-gray-700'
                          }`}
                          data-testid={`ability-level-${ability.id}-${level}`}
                        />
                      ))}
                    </div>
                    <div className="text-[9px] text-gray-400 text-center">
                      Level {currentLevel}/{ability.maxLevel}
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-gray-400 mb-1.5 min-h-[24px]">
                    {currentLevel > 0 && levelEffect 
                      ? <span className="text-green-400">{levelEffect.description}</span>
                      : ability.description
                    }
                  </div>
                  
                  <Button
                    size="sm"
                    variant={isMaxed ? "secondary" : canUpgrade ? "default" : "outline"}
                    className={`w-full h-6 text-[10px] ${
                      isMaxed 
                        ? 'bg-purple-900/50 text-purple-400 cursor-default' 
                        : canUpgrade 
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                          : 'border-gray-600 text-gray-500'
                    }`}
                    disabled={!canUpgrade}
                    onClick={() => handleUpgrade(ability.id)}
                    data-testid={`upgrade-btn-${ability.id}`}
                  >
                    {isMaxed ? (
                      'MAXED'
                    ) : (
                      <>
                        Upgrade ({ability.costPerLevel} $BASED)
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800">
            <span>Earn 10 $BASED per wave completed</span>
            <span className="text-cyan-400">Session Points: {points}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
