import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function getRarityClass(rarity: string): string {
  const rarityMap: Record<string, string> = {
    'Epic Legendary': 'bg-gradient-to-r from-purple-600/30 to-amber-500/30 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.3)]',
    'Very Rare Legendary': 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    'Rare': 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]',
    'Less Rare': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
    'Less Common': 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
    'Common': 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    'Most Common': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  };

  return rarityMap[rarity] || rarityMap['Most Common'];
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    'Epic Legendary': '#9333ea',
    'Very Rare Legendary': '#ef4444',
    'Rare': '#f97316',
    'Less Rare': '#eab308',
    'Less Common': '#22c55e',
    'Common': '#3b82f6',
    'Most Common': '#6b7280'
  };
  return colors[rarity] || '#6b7280';
}
