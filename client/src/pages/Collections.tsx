import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export default function Collections() {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  async function fetchCollections() {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      setCollections(data);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="collections-loading">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const featured = collections.filter(c => c.isFeatured);
  const other = collections.filter(c => !c.isFeatured);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-orbitron font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent" data-testid="collections-title">
          {t('collections.title', 'NFT Collections')}
        </h1>
        <p className="text-gray-400 text-lg">
          {t('collections.subtitle', 'Discover and trade NFTs from verified collections across the BasedAI ecosystem')}
        </p>
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
        ) : collections.length === 0 ? (
          <div className="text-center py-12" data-testid="collections-empty">
            <p className="text-gray-500">{t('collections.empty', 'No collections available yet')}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const floorPrice = (Number(collection.floorPrice) / 1e18).toFixed(2);
  const volume = (Number(collection.volumeTraded) / 1e18).toFixed(2);

  return (
    <Link href={`/marketplace?collection=${collection.contractAddress}`}>
      <Card 
        className="bg-black/40 border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(0,255,255,0.15)] transition-all cursor-pointer group"
        data-testid={`collection-card-${collection.id}`}
      >
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          {collection.bannerImage ? (
            <img 
              src={collection.bannerImage} 
              alt={collection.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />
          )}
          {collection.isFeatured && (
            <Badge className="absolute top-4 right-4 bg-cyan-500 text-black font-orbitron">Featured</Badge>
          )}
        </div>
        
        <CardHeader>
          <div className="flex items-center gap-3">
            {collection.thumbnailImage ? (
              <img 
                src={collection.thumbnailImage} 
                alt={collection.name}
                className="w-12 h-12 rounded-full border-2 border-cyan-400"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-400/50" />
            )}
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
              <p className="font-bold text-cyan-400">{floorPrice} BASED</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Volume</p>
              <p className="font-bold text-purple-400">{volume} BASED</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
