import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NFT_CONTRACT } from '@/lib/constants';
import { Navbar } from '@/components/Navbar';
import { useAccount } from 'wagmi';
import { GuardianLoader } from '@/components/ui/LoadingSpinner';

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
  bannerImage: 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/345.png',
  thumbnailImage: 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeigklna3comgshfndjcbmdjechrj6qkl74dnn77piysmfli7jvlzfq/NeoStrike%20Hackers/NeoStrike_Hackers_1.jpg',
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collections');

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

  async function fetchCollections() {
    try {
      console.log('[Collections] Fetching collections from API...');
      const res = await fetch('/api/collections');
      const data = await res.json();
      
      console.log('[Collections] API returned:', data.length, 'collections');
      console.log('[Collections] First 5 collections:', data.slice(0, 5).map((c: Collection) => c.name));
      
      const hasBasedGuardians = data.some(
        (c: Collection) => c.contractAddress.toLowerCase() === NFT_CONTRACT.toLowerCase()
      );
      
      if (!hasBasedGuardians) {
        console.log('[Collections] Adding Based Guardians as default');
        setCollections([BASED_GUARDIANS_DEFAULT, ...data]);
      } else {
        console.log('[Collections] Based Guardians already in data');
        setCollections(data);
      }
      
      console.log('[Collections] Total collections set:', data.length + (hasBasedGuardians ? 0 : 1));
    } catch (error) {
      console.error('[Collections] Failed to fetch collections:', error);
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
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
          <GuardianLoader text="Loading Collections..." />
        </div>
      </>
    );
  }

  const featured = collections.filter(c => c.isFeatured);
  const other = collections.filter(c => !c.isFeatured);

  return (
    <>
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isConnected={isConnected}
      />
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
        <div className="container mx-auto px-4 py-8 pt-24">
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-orbitron font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              {t('collections.title', 'NFT Collections')}
            </h1>
            <p className="text-gray-400 text-lg">
              {t('collections.subtitle', 'Discover verified NFT collections on BasedAI')}
            </p>
          </div>

          {/* Featured Collections */}
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

          {/* All Collections */}
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

        </div>
      </div>
    </>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const floorPrice = (Number(collection.floorPrice) / 1e18).toFixed(2);
  const volume = (Number(collection.volumeTraded) / 1e18).toFixed(2);
  
  const imageUrl = collection.thumbnailImage || collection.bannerImage;

  return (
    <Link href="/marketplace">
      <Card 
        className="bg-black/40 border-cyan-500/20 hover:border-cyan-400/50 transition-all cursor-pointer group overflow-hidden"
      >
        <div className="relative h-48 overflow-hidden rounded-t-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10">
          
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <span className="text-5xl font-orbitron font-bold text-white/10">
              {collection.symbol}
            </span>
          </div>
          
          {imageUrl && (
            <img 
              src={imageUrl}
              alt={collection.name}
              className="absolute inset-0 w-full h-full object-cover z-10 group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                console.warn('⚠️ Image failed:', collection.symbol, imageUrl);
                e.currentTarget.style.opacity = '0';
              }}
            />
          )}
          
          {collection.isFeatured && (
            <Badge className="absolute top-4 right-4 z-20 bg-cyan-500 text-black font-orbitron">
              Featured
            </Badge>
          )}
        </div>
        
        <CardHeader>
          <CardTitle className="text-xl text-white font-orbitron">
            {collection.name}
          </CardTitle>
          <p className="text-sm text-cyan-400/70">{collection.symbol}</p>
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
