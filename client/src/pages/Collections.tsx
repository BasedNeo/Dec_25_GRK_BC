import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Users, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NFT_CONTRACT } from '@/lib/constants';
import { Navbar } from '@/components/Navbar';
import { useAccount } from 'wagmi';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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

// IPFS gateway for reliable image loading
const IPFS_IMAGE_BASE = 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y';

// Default Based Guardians collection with reliable IPFS images
const BASED_GUARDIANS_DEFAULT: Collection = {
  id: 1,
  contractAddress: NFT_CONTRACT.toLowerCase(),
  name: 'Based Guardians',
  symbol: 'GUARDIAN',
  description: 'The official Based Guardians NFT collection - 3,732 unique cyberpunk guardians protecting the BasedAI ecosystem.',
  bannerImage: `${IPFS_IMAGE_BASE}/42.png`,
  thumbnailImage: `${IPFS_IMAGE_BASE}/1.png`,
  totalSupply: 3732,
  floorPrice: '0',
  volumeTraded: '0',
  isFeatured: true
};

export default function Collections() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { isConnected } = useAccount();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collections');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'hub') setLocation('/');
    else if (tab === 'guardians') setLocation('/');
    else if (tab === 'odyssey') setLocation('/odyssey');
    else if (tab === 'arcade') setLocation('/arcade');
    else if (tab === 'marketplace') setLocation('/marketplace');
    else if (tab === 'collections') setLocation('/collections');
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  async function fetchCollections() {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      
      // Ensure Based Guardians is always in the list
      const hasBasedGuardians = data.some(
        (c: Collection) => c.contractAddress.toLowerCase() === NFT_CONTRACT.toLowerCase()
      );
      
      if (!hasBasedGuardians) {
        // Add Based Guardians as the default featured collection
        setCollections([BASED_GUARDIANS_DEFAULT, ...data]);
      } else {
        setCollections(data);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      // Fallback to Based Guardians if API fails
      setCollections([BASED_GUARDIANS_DEFAULT]);
    } finally {
      setLoading(false);
    }
  }

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

  // Filter collections based on selected project
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
      <div className="container mx-auto px-4 py-8">
        {/* Header with Project Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-orbitron font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent" data-testid="collections-title">
            {t('collections.title', 'NFT Collections')}
          </h1>
          <p className="text-gray-400 text-lg">
            {t('collections.subtitle', 'Discover and trade NFTs from verified collections across the BasedAI ecosystem')}
          </p>
        </div>
        
        {/* Project Selector Dropdown */}
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

      <div>
        <h2 className="text-2xl font-orbitron font-bold mb-6 flex items-center gap-2 text-white">
          <Users className="w-6 h-6 text-cyan-400" />
          {t('collections.all', 'All Collections')}
        </h2>
        {other.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {other.map(collection => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-12" data-testid="collections-empty">
            <p className="text-gray-500">{t('collections.empty', 'No collections available yet')}</p>
          </div>
        ) : null}
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
    <Link href={`/marketplace?collection=${collection.contractAddress}`}>
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
