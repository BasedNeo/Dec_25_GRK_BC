import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ArrowUpRight, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

interface TrendingCollection {
  contractAddress: string;
  name: string;
  thumbnailImage: string | null;
  floorPrice: string | null;
  volumeTraded: string | null;
  volume24h: string;
  percentChange: number;
  salesCount: number;
}

export function TrendingCollections({
  limit = 5,
  compact = false
}: {
  limit?: number;
  compact?: boolean;
}) {
  const [, setLocation] = useLocation();

  const { data: trending, isLoading, error } = useQuery<TrendingCollection[]>({
    queryKey: ['trendingCollections', limit],
    queryFn: async () => {
      const res = await fetch(`/api/trending/collections?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch trending');
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: 120000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error || !trending || trending.length === 0) {
    return null;
  }

  const handleCollectionClick = (address: string) => {
    setLocation(`/marketplace?collection=${address}`);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-cyan-500 font-medium mb-3">
          <TrendingUp className="h-4 w-4" />
          <span>Trending</span>
        </div>
        {trending.slice(0, 3).map((collection, index) => (
          <motion.button
            key={collection.contractAddress}
            onClick={() => handleCollectionClick(collection.contractAddress)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            data-testid={`trending-compact-${collection.contractAddress}`}
          >
            <span className="text-gray-500 font-medium w-4">{index + 1}</span>
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              {collection.thumbnailImage ? (
                <img
                  src={collection.thumbnailImage}
                  alt={collection.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-cyan-500 text-xs font-bold">
                  {collection.name?.[0] || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-white text-sm font-medium truncate">{collection.name}</div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-gray-500" />
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cyan-500" />
          <h3 className="font-semibold text-white">Trending Collections</h3>
        </div>
        <button
          onClick={() => setLocation('/marketplace')}
          className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1"
          data-testid="button-view-all-trending"
        >
          View All <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-3">
        {trending.map((collection, index) => (
          <motion.button
            key={collection.contractAddress}
            onClick={() => handleCollectionClick(collection.contractAddress)}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-800/50 border border-transparent hover:border-gray-700 transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            data-testid={`trending-${collection.contractAddress}`}
          >
            <span className="text-gray-500 font-bold w-6 text-lg">{index + 1}</span>
            <div className="h-12 w-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
              {collection.thumbnailImage ? (
                <img
                  src={collection.thumbnailImage}
                  alt={collection.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-cyan-500 font-bold">
                  {collection.name?.[0] || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-white font-medium truncate">{collection.name}</div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Floor: {collection.floorPrice ? `${parseFloat(collection.floorPrice).toFixed(0)} BASED` : '-'}</span>
                <span>{collection.salesCount} sales (24h)</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-medium">
                {parseFloat(collection.volume24h).toFixed(0)} BASED
              </div>
              <div className="text-xs text-gray-400">24h Volume</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
