import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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

interface Listing {
  id: number;
  tokenId: number;
  collectionAddress: string;
  sellerAddress: string;
  price: string;
  isActive: boolean;
  listedAt: string;
  metadata: string | null;
  rarity: string | null;
}

interface SearchResult {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

const DEFAULT_FILTERS: FilterState = {
  minPrice: '',
  maxPrice: '',
  rarities: [],
  sortBy: 'recent',
  traits: {}
};

export default function Marketplace() {
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(searchParams);
  
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState(urlParams.get('q') || '');
  const [collectionFilter, setCollectionFilter] = useState(urlParams.get('collection') || '');
  const [page, setPage] = useState(1);
  const [gridSize, setGridSize] = useState<'small' | 'large'>('large');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const q = urlParams.get('q');
    const collection = urlParams.get('collection');
    if (q) setSearchQuery(q);
    if (collection) setCollectionFilter(collection);
  }, [searchParams]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (collectionFilter) params.set('collection', collectionFilter);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.rarities.length > 0) params.set('rarity', filters.rarities.join(','));
    if (filters.sortBy !== 'recent') params.set('sortBy', filters.sortBy);
    params.set('page', page.toString());
    params.set('limit', '20');
    return params.toString();
  }, [searchQuery, collectionFilter, filters, page]);

  const { data: searchResults, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['marketplaceSearch', queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/search/listings?${queryParams}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    staleTime: 30000
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (collectionFilter) params.set('collection', collectionFilter);
    setLocation(`/marketplace${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setCollectionFilter('');
    setPage(1);
    setLocation('/marketplace');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      <div className="container mx-auto px-4 py-8">
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
            {(searchQuery || collectionFilter || filters.minPrice || filters.maxPrice || filters.rarities.length > 0) && (
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <span className="text-gray-400 text-sm">Active filters:</span>
                {searchQuery && (
                  <span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-sm flex items-center gap-1">
                    Search: {searchQuery}
                    <button onClick={() => handleSearch('')} className="hover:text-white">×</button>
                  </span>
                )}
                {collectionFilter && (
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm flex items-center gap-1">
                    Collection
                    <button 
                      onClick={() => {
                        setCollectionFilter('');
                        const params = new URLSearchParams();
                        if (searchQuery) params.set('q', searchQuery);
                        setLocation(`/marketplace${params.toString() ? `?${params.toString()}` : ''}`);
                      }} 
                      className="hover:text-white"
                    >×</button>
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
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">Failed to load listings</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : searchResults && searchResults.listings.length > 0 ? (
              <>
                <div className="mb-4 text-gray-400 text-sm">
                  Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, searchResults.total)} of {searchResults.total} listings
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
                    {searchResults.listings.map((listing, index) => (
                      <motion.div
                        key={listing.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.02 }}
                        className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors group"
                        data-testid={`listing-${listing.id}`}
                      >
                        <div className={`relative ${gridSize === 'large' ? 'aspect-square' : 'aspect-[4/3]'} bg-gray-800`}>
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            #{listing.tokenId}
                          </div>
                          {listing.rarity && (
                            <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                              listing.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                              listing.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                              listing.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                              listing.rarity === 'uncommon' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {listing.rarity}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="font-medium text-white mb-1">Token #{listing.tokenId}</div>
                          <div className="text-cyan-400 font-bold">{parseFloat(listing.price).toLocaleString()} BASED</div>
                          <div className="text-gray-500 text-xs mt-1 truncate">
                            Seller: {listing.sellerAddress.slice(0, 6)}...{listing.sellerAddress.slice(-4)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {searchResults.totalPages > 1 && (
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
                      Page {page} of {searchResults.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(searchResults.totalPages, p + 1))}
                      disabled={page === searchResults.totalPages}
                      className="border-gray-700"
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <Store className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No listings found</h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery || filters.minPrice || filters.maxPrice || filters.rarities.length > 0
                    ? 'Try adjusting your filters or search terms'
                    : 'Be the first to list an NFT on the marketplace!'}
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
