import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  rarities: string[];
  sortBy: 'price_asc' | 'price_desc' | 'recent' | 'oldest';
  traits: Record<string, string[]>;
  collection: string;
}

const RARITY_OPTIONS = [
  { value: 'common', label: 'Common', color: 'text-gray-400' },
  { value: 'uncommon', label: 'Uncommon', color: 'text-green-400' },
  { value: 'rare', label: 'Rare', color: 'text-blue-400' },
  { value: 'epic', label: 'Epic', color: 'text-purple-400' },
  { value: 'legendary', label: 'Legendary', color: 'text-yellow-400' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Listed' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'oldest', label: 'Oldest First' },
];

export function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
  isMobile = false,
  isOpen = true,
  onClose
}: {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [priceExpanded, setPriceExpanded] = useState(true);
  const [rarityExpanded, setRarityExpanded] = useState(true);
  const [sortExpanded, setSortExpanded] = useState(true);

  const handleRarityToggle = (rarity: string) => {
    const newRarities = filters.rarities.includes(rarity)
      ? filters.rarities.filter(r => r !== rarity)
      : [...filters.rarities, rarity];
    onFilterChange({ ...filters, rarities: newRarities });
  };

  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    onFilterChange({ ...filters, sortBy });
  };

  const activeFilterCount = [
    filters.minPrice ? 1 : 0,
    filters.maxPrice ? 1 : 0,
    filters.rarities.length,
    filters.sortBy !== 'recent' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const sidebarContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-cyan-500" />
          <h3 className="font-semibold text-white">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-cyan-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {isMobile && onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-gray-800"
          data-testid="button-reset-filters"
        >
          Clear All Filters
        </Button>
      )}

      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => setSortExpanded(!sortExpanded)}
          className="w-full flex items-center justify-between text-white font-medium py-2"
          data-testid="button-toggle-sort"
        >
          <span>Sort By</span>
          {sortExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <AnimatePresence>
          {sortExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value as FilterState['sortBy'])}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      filters.sortBy === option.value
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                    data-testid={`sort-${option.value}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => setPriceExpanded(!priceExpanded)}
          className="w-full flex items-center justify-between text-white font-medium py-2"
          data-testid="button-toggle-price"
        >
          <span>Price (BASED)</span>
          {priceExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <AnimatePresence>
          {priceExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className="text-gray-400 text-xs">Min</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-min-price"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Max</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.maxPrice}
                    onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-max-price"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => setRarityExpanded(!rarityExpanded)}
          className="w-full flex items-center justify-between text-white font-medium py-2"
          data-testid="button-toggle-rarity"
        >
          <span>Rarity</span>
          {rarityExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <AnimatePresence>
          {rarityExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2">
                {RARITY_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={filters.rarities.includes(option.value)}
                      onCheckedChange={() => handleRarityToggle(option.value)}
                      className="border-gray-600 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                      data-testid={`checkbox-rarity-${option.value}`}
                    />
                    <span className={option.color}>{option.label}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-gray-900 border-r border-gray-700 z-50 p-4 overflow-y-auto"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
      {sidebarContent}
    </div>
  );
}
