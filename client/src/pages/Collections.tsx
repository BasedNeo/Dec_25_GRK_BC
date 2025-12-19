import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  TrendingUp, 
  Users, 
  Store,
  SlidersHorizontal,
  Grid3X3,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NFT_CONTRACT } from '@/lib/constants';
import { Navbar } from '@/components/Navbar';
import { useAccount } from 'wagmi';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { SearchBar } from '@/components/SearchBar';
import { FilterSidebar, type FilterState } from '@/components/FilterSidebar';
import { TrendingCollections } from '@/components/TrendingCollections';
import { useGuardians, type GuardianFilters } from '@/hooks/useGuardians';

interface Collection {
  id: number;
  contractAddress: string;
  name: string;
  symbol: string;
  description: string | null;
  bannerImage: string | null;
  thumbnailImage: string | null;
  totalSupply: number;
  floorPrice: string;
  volumeTraded: string;
  isFeatured: boolean;
}

const BASED_GUARDIANS_DEFAULT: Collection = {
  id: 1,
  contractAddress: NFT_CONTRACT.toLowerCase(),
  name: 'Based Guardians',
  symbol: 'GUARDIAN',
  description: 'The official Based Guardians NFT collection - 3,732 unique cyberpunk guardians protecting the BasedAI ecosystem.',
  bannerImage: 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeigklna3comgshfndjcbmdjechrj6qkl74dnn77piysmfli7jvlzfq/Darkroot%20Alchemists/Darkroot_Alchemists_2.jpg',
  thumbnailImage: 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeigklna3comgshfndjcbmdjechrj6qkl74dnn77piysmfli7jvlzfq/NeoStrike%20Hackers/NeoStrike_Hackers_1.jpg',
  totalSupply: 3732,
  floorPrice: '0',
  volumeTraded: '0',
  isFeatured: true
};

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

export default function Collections() {
  const { t } = useTranslation();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(searchParams);
  const { isConnected } = useAccount();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collections');

  const [filters, setFilters] = useState<FilterState>(() => parseFiltersFromURL(urlParams));
  const [searchQuery, setSearchQuery] = useState(urlParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [gridSize, setGridSize] = useState<'small' | 'large'>('large');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'hub') setLocation('/');
    else if (tab === 'guardians') setLocation('/');
    else if (tab === 'odyssey') setLocation('/odyssey');
    else if (tab === 'arcade') setLocation('/arcade');
    else if (tab === 'collections') setLocation('/collections');
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    const q = newParams.get('q');
    setSearchQuery(q || '');
    setFilters(parseFiltersFromURL(newParams));
  }, [searchParams]);

  async function fetchCollections() {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      
      const hasBasedGuardians = data.some(
        (c: Collection) => c.contractAddress.toLowerCase() === NFT_CONTRACT.toLowerCase()
      );
      
      if (!hasBasedGuardians) {
        setCollections([BASED_GUARDIANS_DEFAULT, ...data]);
      } else {
        setCollections(data);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      setCollections([BASED_GUARDIANS_DEFAULT]);
    } finally {
      setLoading(false);
    }
  }

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
    isLoading: guardiansLoading, 
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


  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    setLocation(`/collections${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setPage(1);
    setLocation('/collections');
  };

  const handleNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    setPage(p => p + 1);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (loading) {
    return (
      <>
        <Navbar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isConnected={isConnected}
        />
        <div className="container mx-auto px-4 py-8" data-testid="collections-loading">
          <div className="mb-12">
            <Skeleton width={300} height={48} baseColor="#1f2937" highlightColor="#374151" />
            <Skeleton width={400} height={24} baseColor="#1f2937" highlightColor="#374151" className="mt-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
                <Skeleton height={192} baseColor="#1f2937" highlightColor="#374151" />
                <div className="p-4">
                  <Skeleton width="70%" height={24} baseColor="#1f2937" highlightColor="#374151" />
                  <Skeleton width="50%" baseColor="#1f2937" highlightColor="#374151" className="mt-2" />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <Skeleton height={40} baseColor="#1f2937" highlightColor="#374151" />
                    <Skeleton height={40} baseColor="#1f2937" highlightColor="#374151" />
                    <Skeleton height={40} baseColor="#1f2937" highlightColor="#374151" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const filteredCollections = selectedProject === 'all' 
    ? collections 
    : collections.filter(c => c.contractAddress.toLowerCase() === selectedProject.toLowerCase());

  const featured = filteredCollections.filter(c => c.isFeatured);
  const other = filteredCollections.filter(c => !c.isFeatured);

  return (
    <>
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isConnected={isConnected}
      />
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-5xl font-orbitron font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent" data-testid="collections-title">
                {t('collections.title', 'NFT Collections')}
              </h1>
              <p className="text-gray-400 text-lg">
                {t('collections.subtitle', 'Discover and trade NFTs from verified collections across the BasedAI ecosystem')}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 whitespace-nowrap">Project:</span>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger 
                  className="w-[220px] bg-black/60 border-cyan-500/30 text-white hover:border-cyan-400/60 transition-colors"
                  data-testid="select-project"
                >
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-cyan-500/30">
                  <SelectItem 
                    value="all" 
                    className="text-white hover:bg-cyan-500/10 focus:bg-cyan-500/10"
                  >
                    All Projects
                  </SelectItem>
                  {collections.map(collection => (
                    <SelectItem 
                      key={collection.id} 
                      value={collection.contractAddress.toLowerCase()}
                      className="text-white hover:bg-cyan-500/10 focus:bg-cyan-500/10"
                    >
                      <div className="flex items-center gap-2">
                        {collection.thumbnailImage && (
                          <img 
                            src={collection.thumbnailImage} 
                            alt="" 
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        {collection.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {featured.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-orbitron font-bold mb-6 flex items-center gap-2 text-white">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
                {t('collections.featured', 'Featured Collections')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map(collection => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-orbitron font-bold mb-6 flex items-center gap-2 text-white">
                <Users className="w-6 h-6 text-cyan-400" />
                {t('collections.all', 'All Collections')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {other.map(collection => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-cyan-500/20 pt-12 mt-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Store className="h-8 w-8 text-cyan-500" />
                <h2 className="text-3xl font-bold text-white font-orbitron">{t('collections.browseNFTs', 'Browse NFTs')}</h2>
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
                <div className="sticky top-24 space-y-6">
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

                {guardiansLoading ? (
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
                ) : filteredGuardians.length > 0 ? (
                  <>
                    <div className="mb-4 text-gray-400 text-sm">
                      Showing {filteredGuardians.length} Guardians (Page {page})
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
                        {filteredGuardians.map((guardian, index) => (
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
                              {guardian.price && Number(guardian.price) > 0 ? (
                                <div className="text-cyan-400 font-bold">
                                  {Number(guardian.price).toLocaleString()} {guardian.currency || 'BASED'}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic text-sm">Unlisted</div>
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
                <div className="sticky top-24">
                  <TrendingCollections limit={5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const FALLBACK_BANNER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"%3E%3Cdefs%3E%3ClinearGradient id="bg" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" stop-color="%23001a1a"/%3E%3Cstop offset="50%25" stop-color="%23003333"/%3E%3Cstop offset="100%25" stop-color="%23001a2e"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="400" height="200" fill="url(%23bg)"/%3E%3Ccircle cx="50" cy="40" r="2" fill="%2300ffff" opacity="0.5"/%3E%3Ccircle cx="350" cy="60" r="1.5" fill="%23bf00ff" opacity="0.4"/%3E%3Ccircle cx="200" cy="30" r="1" fill="%23ffffff" opacity="0.3"/%3E%3Ccircle cx="100" cy="150" r="1.5" fill="%2300ffff" opacity="0.3"/%3E%3Ccircle cx="300" cy="170" r="2" fill="%23bf00ff" opacity="0.4"/%3E%3C/svg%3E';

const FALLBACK_THUMBNAIL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cdefs%3E%3ClinearGradient id="thumb" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" stop-color="%2300ffff"/%3E%3Cstop offset="100%25" stop-color="%23bf00ff"/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx="50" cy="50" r="50" fill="url(%23thumb)"/%3E%3Ctext x="50" y="58" font-size="32" text-anchor="middle" fill="white"%3E%F0%9F%9B%A1%EF%B8%8F%3C/text%3E%3C/svg%3E';

function CollectionCard({ collection }: { collection: Collection }) {
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  
  const floorPrice = (Number(collection.floorPrice) / 1e18).toFixed(2);
  const volume = (Number(collection.volumeTraded) / 1e18).toFixed(2);

  const bannerSrc = collection.bannerImage || FALLBACK_BANNER;
  const thumbSrc = collection.thumbnailImage || FALLBACK_THUMBNAIL;

  return (
    <Link href={`/collections?collection=${collection.contractAddress}`}>
      <Card 
        className="bg-black/40 border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(0,255,255,0.15)] transition-all cursor-pointer group overflow-hidden"
        data-testid={`collection-card-${collection.id}`}
      >
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          {!bannerLoaded && !bannerError && (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 animate-pulse" />
          )}
          <img 
            src={bannerError ? FALLBACK_BANNER : bannerSrc} 
            alt={collection.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${bannerLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setBannerLoaded(true)}
            onError={() => {
              setBannerError(true);
              setBannerLoaded(true);
            }}
          />
          {collection.isFeatured && (
            <Badge className="absolute top-4 right-4 bg-cyan-500 text-black font-orbitron">Featured</Badge>
          )}
        </div>
        
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              {!thumbLoaded && !thumbError && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-400/50 animate-pulse" />
              )}
              <img 
                src={thumbError ? FALLBACK_THUMBNAIL : thumbSrc} 
                alt={collection.name}
                className={`w-12 h-12 rounded-full border-2 border-cyan-400 object-cover ${thumbLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setThumbLoaded(true)}
                onError={() => {
                  setThumbError(true);
                  setThumbLoaded(true);
                }}
              />
            </div>
            <div>
              <CardTitle className="text-xl text-white font-orbitron">{collection.name}</CardTitle>
              <p className="text-sm text-cyan-400/70">{collection.symbol}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {collection.description && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
              {collection.description}
            </p>
          )}
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Items</p>
              <p className="font-bold text-white">{collection.totalSupply}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Floor</p>
              <p className="font-bold text-cyan-400">
                {Number(floorPrice) >= 1 ? `${floorPrice} BASED` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Volume</p>
              <p className="font-bold text-purple-400">
                {Number(volume) >= 1 ? `${volume} BASED` : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
