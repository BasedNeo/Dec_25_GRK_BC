import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRarityClass(rarity: string) {
  // Normalize rarity keys first
  let key = rarity;
  if (rarity === 'Rarest (1/1s)' || rarity === 'Legendary') key = 'Rarest-Legendary';
  
  const rarityMap: Record<string, string> = {
    'Rarest-Legendary': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]',
    'Very Rare': 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(192,132,252,0.2)]',
    'More Rare': 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]', // Gold
    'Rarest': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]', // Backwards compatibility
    'Rare': 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]', // Yellow
    'Less Rare': 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(96,165,250,0.2)]',
    'Less Common': 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.2)]',
    'Common': 'bg-white/10 text-white border-white/20',
    'Most Common': 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };

  return rarityMap[key] || rarityMap['Common'];
}
