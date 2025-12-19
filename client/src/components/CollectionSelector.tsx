import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface Collection {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: number;
  representativeImage?: string;
}

interface CollectionSelectorProps {
  collections: Collection[];
  selectedCollection: string | null;
  onSelectCollection: (address: string | null) => void;
  loading?: boolean;
}

export default function CollectionSelector({ 
  collections, 
  selectedCollection, 
  onSelectCollection,
  loading 
}: CollectionSelectorProps) {
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8" data-testid="collections-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Scanning wallet for NFT collections...</span>
      </div>
    );
  }

  if (collections.length === 0) {
    return null;
  }

  const totalNFTs = collections.reduce((sum, col) => sum + col.balance, 0);

  return (
    <div className="mb-8" data-testid="collection-selector">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Collections ({collections.length})</h3>
        <span className="text-sm text-muted-foreground">{totalNFTs} Total NFTs</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedCollection === null
              ? 'ring-2 ring-primary shadow-lg'
              : 'hover:ring-1 hover:ring-primary/50'
          }`}
          onClick={() => onSelectCollection(null)}
          data-testid="collection-all"
        >
          <CardContent className="p-4">
            <div className="aspect-square bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-4xl">🎨</span>
            </div>
            <h4 className="font-semibold text-sm mb-1 truncate">All Collections</h4>
            <p className="text-xs text-muted-foreground">{totalNFTs} NFTs</p>
          </CardContent>
        </Card>

        {collections.map(collection => (
          <Card
            key={collection.contractAddress}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedCollection === collection.contractAddress
                ? 'ring-2 ring-primary shadow-lg'
                : 'hover:ring-1 hover:ring-primary/50'
            }`}
            onClick={() => onSelectCollection(
              selectedCollection === collection.contractAddress 
                ? null 
                : collection.contractAddress
            )}
            data-testid={`collection-card-${collection.contractAddress.slice(0, 8)}`}
          >
            <CardContent className="p-4">
              <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                {collection.representativeImage ? (
                  <img
                    src={collection.representativeImage}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23374151"/%3E%3Ctext x="50" y="50" font-size="40" text-anchor="middle" dominant-baseline="middle" fill="%239CA3AF"%3E%F0%9F%96%BC%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🖼️
                  </div>
                )}
              </div>
              <h4 className="font-semibold text-sm mb-1 truncate" title={collection.name}>
                {collection.name}
              </h4>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{collection.balance} NFT{collection.balance !== 1 ? 's' : ''}</p>
                <Badge variant="outline" className="text-xs">{collection.symbol}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
