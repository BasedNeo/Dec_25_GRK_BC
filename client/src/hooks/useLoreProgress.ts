import { useState, useEffect, useMemo, useCallback } from 'react';
import { LORE_CHARACTERS, LORE_LOCATIONS, LORE_EVENTS } from '@/lib/loreData';

const STORAGE_KEY = 'basedguardians_lore_discoveries';

interface DiscoveryState {
  characters: string[];
  locations: string[];
  events: string[];
  secrets: string[];
}

interface LoreProgress {
  discovered: number;
  total: number;
  percentage: number;
  characters: { discovered: number; total: number };
  locations: { discovered: number; total: number };
  events: { discovered: number; total: number };
  secrets: { discovered: number; total: number };
}

function getStoredDiscoveries(): DiscoveryState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
  }
  return { characters: [], locations: [], events: [], secrets: [] };
}

export function useLoreProgress() {
  const [discoveries, setDiscoveries] = useState<DiscoveryState>(getStoredDiscoveries);
  
  useEffect(() => {
    const handleStorage = () => {
      setDiscoveries(getStoredDiscoveries());
    };
    
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      setDiscoveries(getStoredDiscoveries());
    }, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);
  
  const progress: LoreProgress = useMemo(() => {
    const totalCharacters = LORE_CHARACTERS.length;
    const totalLocations = LORE_LOCATIONS.length;
    const totalEvents = LORE_EVENTS.length;
    const totalSecrets = LORE_CHARACTERS.length + LORE_LOCATIONS.length;
    
    const discovered = 
      discoveries.characters.length + 
      discoveries.locations.length + 
      discoveries.events.length + 
      discoveries.secrets.length;
    
    const total = totalCharacters + totalLocations + totalEvents + totalSecrets;
    
    return {
      discovered,
      total,
      percentage: Math.round((discovered / total) * 100),
      characters: { discovered: discoveries.characters.length, total: totalCharacters },
      locations: { discovered: discoveries.locations.length, total: totalLocations },
      events: { discovered: discoveries.events.length, total: totalEvents },
      secrets: { discovered: discoveries.secrets.length, total: totalSecrets },
    };
  }, [discoveries]);
  
  const hasMinimumDiscovery = useCallback((minPercentage: number) => {
    return progress.percentage >= minPercentage;
  }, [progress.percentage]);
  
  const hasDiscoveredAny = useMemo(() => progress.discovered > 0, [progress.discovered]);
  
  return { 
    progress, 
    hasMinimumDiscovery, 
    hasDiscoveredAny,
    discoveries 
  };
}

export function getLoreProgressStatic(): LoreProgress {
  const discoveries = getStoredDiscoveries();
  const totalCharacters = LORE_CHARACTERS.length;
  const totalLocations = LORE_LOCATIONS.length;
  const totalEvents = LORE_EVENTS.length;
  const totalSecrets = LORE_CHARACTERS.length + LORE_LOCATIONS.length;
  
  const discovered = 
    discoveries.characters.length + 
    discoveries.locations.length + 
    discoveries.events.length + 
    discoveries.secrets.length;
  
  const total = totalCharacters + totalLocations + totalEvents + totalSecrets;
  
  return {
    discovered,
    total,
    percentage: Math.round((discovered / total) * 100),
    characters: { discovered: discoveries.characters.length, total: totalCharacters },
    locations: { discovered: discoveries.locations.length, total: totalLocations },
    events: { discovered: discoveries.events.length, total: totalEvents },
    secrets: { discovered: discoveries.secrets.length, total: totalSecrets },
  };
}
