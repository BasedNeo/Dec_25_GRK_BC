import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { 
  Store, 
  SlidersHorizontal, 
  Grid3X3, 
  LayoutGrid, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/SearchBar';
import { FilterSidebar, type FilterState } from '@/components/FilterSidebar';
import { TrendingCollections } from '@/components/TrendingCollections';
import { useGuardians, type GuardianFilters } from '@/hooks/useGuardians';
import { Guardian } from '@/lib/mockData';
import { IPFS_ROOT } from '@/lib/constants';
import { Navbar } from '@/components/Navbar';
import { useAccount } from 'wagmi';

const DEFAULT_FILTERS: FilterState = {
  minPrice: '',
  maxPrice: '',
  rarities: [],
  sortBy: 'recent',
  traits: {}
};

function parseFiltersFromURL(params: URLSearchParams): FilterState {
  const rarityParam = params.get('rarity');
  return {
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    rarities: rarityParam ? rarityParam.split(',').filter(r => ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].includes(r)) : [],
    sortBy: (params.get('sortBy') as FilterState['sortBy']) || 'recent',
    traits: {}
  };
}

export default function Marketplace() {
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(searchParams);
  const { isConnected } = useAccount();
  
  const [filters, setFilters] = useState<FilterState>(() => parseFiltersFromURL(urlParams));
  const [searchQuery, setSearchQuery] = useState(urlParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [gridSize, setGridSize] = useState<'small' | 'large'>('large');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('marketplace');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'hub') setLocation('/');
    else if (tab === 'guardians') setLocation('/');
    else if (tab === 'odyssey') setLocation('/odyssey');
    else if (tab === 'arcade') setLocation('/arcade');
    else if (tab === 'marketplace') setLocation('/marketplace');
  };

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    const q = newParams.get('q');
    
    setSearchQuery(q || '');
    setFilters(parseFiltersFromURL(newParams));
  }, [searchParams]);

  const guardianFilters: GuardianFilters = useMemo(() => {
    const sortMapping: Record<string, string> = {
      'recent': 'id-desc',
      'oldest': 'id-asc',
      'price_asc': 'price-asc',
      'price_desc': 'price-desc'
    };
    
    return {
      search: searchQuery || undefined,
      rarity: filters.rarities.length === 1 ? filters.rarities[0] : undefined,
      sortBy: sortMapping[filters.sortBy] || 'id-desc',
      startOffset: (page - 1) * 20
    };
  }, [searchQuery, filters, page]);

  const { 
    data, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useGuardians(false, true, guardianFilters);

  const allGuardians = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(p => p.nfts);
  }, [data]);

  const filteredGuardians = useMemo(() => {
    let result = allGuardians;
    
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      result = result.filter(g => (g.price || 0) >= min);
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      result = result.filter(g => (g.price || 0) <= max);
    }
    if (filters.rarities.length > 1) {
      result = result.filter(g => filters.rarities.includes(g.rarity || 'Common'));
    }
    
    return result;
  }, [allGuardians, filters]);

  const paginatedGuardians = useMemo(() => {
    const startIndex = 0;
    const endIndex = 20;
    return filteredGuardians.slice(startIndex, endIndex);
  }, [filteredGuardians]);

  const totalPages = Math.ceil(filteredGuardians.length / 20) || 1;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    setLocation(`/marketplace${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setPage(1);
    setLocation('/marketplace');
  };

  const handleNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    setPage(p => p + 1);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getImageUrl = (guardian: Guardian) => {
    if (guardian.image) return guardian.image;
    return `${IPFS_ROOT}${guardian.id}.json`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isConnected={isConnected}
      />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Store className="h-8 w-8 text-cyan-500" />
            <h1 className="text-3xl font-bold text-white font-orbitron">Marketplace</h1>
          </div>
          <p className="text-gray-400">Discover and trade unique NFTs in the Based Guardians universe</p>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="w-full md:w-96">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search NFTs by ID or traits..."
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden border-gray-700 text-gray-300"
              onClick={() => setShowMobileFilters(true)}
              data-testid="button-mobile-filters"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setGridSize('large')}
                className={`p-2 rounded ${gridSize === 'large' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="button-grid-large"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setGridSize('small')}
                className={`p-2 rounded ${gridSize === 'small' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                data-testid="button-grid-small"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-6">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
              />
              <TrendingCollections compact limit={3} />
            </div>
          </div>

          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            isMobile
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
          />

          <div className="flex-1">
            {(searchQuery || filters.minPrice || filters.maxPrice || filters.rarities.length > 0) && (
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <span className="text-gray-400 text-sm">Active filters:</span>
                {searchQuery && (
                  <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-sm flex items-center gap-1">
                    Search: {searchQuery}
                    <button onClick={() => handleSearch('')} className="hover:text-white">×</button>
                  </span>
                )}
                {filters.minPrice && (
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                    Min: {filters.minPrice} BASED
                  </span>
                )}
                {filters.maxPrice && (
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                    Max: {filters.maxPrice} BASED
                  </span>
                )}
                {filters.rarities.map(r => (
                  <span key={r} className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm capitalize">
                    {r}
                  </span>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className={`grid gap-4 ${
                gridSize === 'large' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
                    <Skeleton 
                      height={gridSize === 'large' ? 280 : 180} 
                      baseColor="#1f2937" 
                      highlightColor="#374151"
                    />
                    <div className="p-4">
                      <Skeleton width="60%" baseColor="#1f2937" highlightColor="#374151" />
                      <Skeleton width="40%" baseColor="#1f2937" highlightColor="#374151" className="mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">Failed to load NFTs</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : paginatedGuardians.length > 0 ? (
              <>
                <div className="mb-4 text-gray-400 text-sm">
                  Showing {paginatedGuardians.length} of {filteredGuardians.length} Guardians
                </div>
                
                <motion.div 
                  className={`grid gap-4 ${
                    gridSize === 'large' 
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                  }`}
                  layout
                >
                  <AnimatePresence mode="popLayout">
                    {paginatedGuardians.map((guardian, index) => (
                      <motion.div
                        key={guardian.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.02 }}
                        className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors group cursor-pointer"
                        data-testid={`guardian-${guardian.id}`}
                      >
                        <div className={`relative ${gridSize === 'large' ? 'aspect-square' : 'aspect-[4/3]'} bg-gray-800 overflow-hidden`}>
                          {guardian.image ? (
                            <img 
                              src={guardian.image} 
                              alt={guardian.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                              #{guardian.id}
                            </div>
                          )}
                          {guardian.rarity && (
                            <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                              guardian.rarity === 'Legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                              guardian.rarity === 'Epic' ? 'bg-purple-500/20 text-purple-400' :
                              guardian.rarity === 'Rare' ? 'bg-blue-500/20 text-blue-400' :
                              guardian.rarity === 'Uncommon' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {guardian.rarity}
                            </div>
                          )}
                          {guardian.isListed && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
                              Listed
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="font-medium text-white mb-1">{guardian.name}</div>
                          {guardian.price && (
                            <div className="text-cyan-400 font-bold">
                              {guardian.price.toLocaleString()} {guardian.currency || 'BASED'}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {(hasNextPage || page > 1) && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-gray-700"
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-gray-400">
                      Page {page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!hasNextPage && page >= totalPages}
                      className="border-gray-700"
                      data-testid="button-next-page"
                    >
                      {isFetchingNextPage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <Store className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No Guardians found</h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery || filters.minPrice || filters.maxPrice || filters.rarities.length > 0
                    ? 'Try adjusting your filters or search terms'
                    : 'Loading Guardians from the blockchain...'}
                </p>
                {(searchQuery || filters.minPrice || filters.maxPrice || filters.rarities.length > 0) && (
                  <Button onClick={handleResetFilters} variant="outline" className="border-cyan-500 text-cyan-400">
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4">
              <TrendingCollections limit={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
