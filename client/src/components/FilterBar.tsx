import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, ChevronDown, LayoutGrid, List, History, ArrowUpDown, SlidersHorizontal, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RARITY_CONFIG } from "@/lib/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import './FilterBar.css';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  rarity: string;
  onRarityChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalItems: number;
  showingItems: number;
  availableTraits: Record<string, Set<string>>;
  onClearAll: () => void;
}

const RECENT_SEARCHES_KEY = 'nft_recent_searches';

export function FilterBar({
  search,
  onSearchChange,
  rarity,
  onRarityChange,
  type,
  onTypeChange,
  role,
  onRoleChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalItems,
  showingItems,
  availableTraits,
  onClearAll
}: FilterBarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to history on debounce/submit (simplified here to on blur or effect)
  useEffect(() => {
    if (search.length > 2) {
      const timer = setTimeout(() => {
        setRecentSearches(prev => {
          const newSearches = [search, ...prev.filter(s => s !== search)].slice(0, 5);
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
          return newSearches;
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const activeFilterCount = [
    rarity !== 'all',
    type !== 'all',
    role !== 'all',
    search !== ''
  ].filter(Boolean).length;

  const handleRecentSearchClick = (term: string) => {
    onSearchChange(term);
    setIsSearchFocused(false);
  };

  // Helper to get counts (mocked or derived if passed, for now simple labels)
  const getRarityLabel = (r: string) => {
    return r === 'all' ? 'All Rarities' : r;
  };

  return (
    <div className="fb-container">
      {/* Top Row: Search & Mobile Filter Toggle */}
      <div className="fb-search-row">
        <div className="fb-search-wrapper">
          <Search className="fb-search-icon" size={18} />
          <Input
            ref={searchInputRef}
            placeholder="Search by ID (e.g. 3000) or Name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="fb-search-input"
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="fb-search-clear">
              <X size={14} />
            </button>
          )}

          {/* Recent Searches Dropdown */}
          <AnimatePresence>
            {isSearchFocused && recentSearches.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="fb-recent-searches"
              >
                <div className="fb-recent-header">
                  <span>Recent Searches</span>
                  <button onClick={clearRecentSearches} className="text-xs hover:text-white">Clear</button>
                </div>
                {recentSearches.map((term, i) => (
                  <button 
                    key={i} 
                    className="fb-recent-item"
                    onClick={() => handleRecentSearchClick(term)}
                  >
                    <History size={14} />
                    <span>{term}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Filter Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:hidden fb-mobile-filter-btn">
              <Filter size={16} className="mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-black">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="fb-mobile-sheet">
             <SheetHeader>
               <SheetTitle>Filters</SheetTitle>
             </SheetHeader>
             <div className="fb-mobile-filters">
                <div className="space-y-4 py-4">
                  {/* Mobile Filters Content */}
                   <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">RARITY</label>
                      <Select value={rarity} onValueChange={onRarityChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Rarities</SelectItem>
                          {Object.keys(RARITY_CONFIG).map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">BIOLOGICAL TYPE</label>
                      <Select value={type} onValueChange={onTypeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {Array.from(availableTraits['Biological Type'] || []).sort().map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">ROLE</label>
                      <Select value={role} onValueChange={onRoleChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          {Array.from(availableTraits['Role'] || []).sort().map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground">SORT BY</label>
                      <Select value={sortBy} onValueChange={onSortChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recent">Recently Minted</SelectItem>
                            <SelectItem value="id-asc">Token ID (Low to High)</SelectItem>
                            <SelectItem value="id-desc">Token ID (High to Low)</SelectItem>
                            <SelectItem value="rarity-asc">Rarity (Rarest First)</SelectItem>
                            <SelectItem value="rarity-desc">Rarity (Common First)</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                </div>
                <div className="fb-mobile-actions">
                   <Button variant="outline" className="w-full" onClick={onClearAll}>Clear All</Button>
                   <SheetClose asChild>
                     <Button className="w-full bg-primary text-black">Apply Filters</Button>
                   </SheetClose>
                </div>
             </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filter Row */}
      <div className="fb-filters-row hidden md:flex">
        <div className="flex items-center gap-3 flex-1 overflow-x-auto no-scrollbar py-1">
          {/* Rarity Dropdown */}
          <Select value={rarity} onValueChange={onRarityChange}>
            <SelectTrigger className={`fb-filter-select ${rarity !== 'all' ? 'active' : ''}`}>
               <span className="text-muted-foreground mr-1">Rarity:</span>
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Object.keys(RARITY_CONFIG).map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Dropdown */}
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger className={`fb-filter-select ${type !== 'all' ? 'active' : ''}`}>
               <span className="text-muted-foreground mr-1">Type:</span>
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Array.from(availableTraits['Biological Type'] || []).sort().map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role Dropdown */}
          <Select value={role} onValueChange={onRoleChange}>
            <SelectTrigger className={`fb-filter-select ${role !== 'all' ? 'active' : ''}`}>
               <span className="text-muted-foreground mr-1">Role:</span>
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Array.from(availableTraits['Role'] || []).sort().map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* More Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
               <Button variant="ghost" className="fb-more-filters-btn">
                  <SlidersHorizontal size={14} className="mr-2" />
                  More Filters
               </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 bg-black/95 border-white/20">
               <div className="space-y-4">
                  <h4 className="font-orbitron text-sm">Additional Attributes</h4>
                  <div className="space-y-2">
                     <label className="text-xs text-muted-foreground">Background</label>
                     <Select disabled>
                        <SelectTrigger><SelectValue placeholder="All Backgrounds" /></SelectTrigger>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs text-muted-foreground">Eyes</label>
                     <Select disabled>
                        <SelectTrigger><SelectValue placeholder="All Eyes" /></SelectTrigger>
                     </Select>
                  </div>
                  <p className="text-xs text-muted-foreground italic">More filters coming soon...</p>
               </div>
            </PopoverContent>
          </Popover>

          {activeFilterCount > 0 && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={onClearAll}
               className="text-xs text-muted-foreground hover:text-white ml-2"
             >
               Clear All
             </Button>
          )}
        </div>

        {/* Right Side: Sort & View */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
           <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="fb-sort-select">
                 <ArrowUpDown size={14} className="mr-2 text-muted-foreground" />
                 <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                  <SelectItem value="recent">Recently Minted</SelectItem>
                  <SelectItem value="id-asc">Token ID (Low to High)</SelectItem>
                  <SelectItem value="id-desc">Token ID (High to Low)</SelectItem>
                  <SelectItem value="rarity-asc">Rarity (Rarest First)</SelectItem>
                  <SelectItem value="rarity-desc">Rarity (Common First)</SelectItem>
              </SelectContent>
           </Select>

           <div className="fb-view-toggle">
              <button 
                className={`fb-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => onViewModeChange('grid')}
                title="Grid View"
              >
                 <LayoutGrid size={16} />
              </button>
              <button 
                className={`fb-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => onViewModeChange('list')}
                title="List View"
              >
                 <List size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Results Count Row */}
      <div className="fb-status-row">
         <span className="text-xs text-muted-foreground font-mono">
            Showing <span className="text-white font-bold">{showingItems}</span> of {totalItems} Guardians
         </span>
         
         {/* Active Filter Chips (Desktop) */}
         <div className="hidden md:flex gap-2 ml-4">
            {rarity !== 'all' && (
               <Badge variant="secondary" className="fb-filter-chip" onClick={() => onRarityChange('all')}>
                  Rarity: {rarity} <X size={10} className="ml-1" />
               </Badge>
            )}
            {type !== 'all' && (
               <Badge variant="secondary" className="fb-filter-chip" onClick={() => onTypeChange('all')}>
                  Type: {type} <X size={10} className="ml-1" />
               </Badge>
            )}
            {role !== 'all' && (
               <Badge variant="secondary" className="fb-filter-chip" onClick={() => onRoleChange('all')}>
                  Role: {role} <X size={10} className="ml-1" />
               </Badge>
            )}
         </div>
      </div>
    </div>
  );
}
