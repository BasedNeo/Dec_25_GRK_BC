import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOffersV3, OffchainOffer } from '@/hooks/useOffersV3';
import { useAccount } from 'wagmi';
import { 
  Gavel, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Wallet,
  Loader2,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function MyOffersPanel() {
  const { isConnected } = useAccount();
  const { myOffers, cancelOffer, completePurchase, isLoading, refresh } = useOffersV3();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleCancel = async (offer: OffchainOffer) => {
    setCancellingId(offer.id);
    await cancelOffer(offer.id, false);
    setCancellingId(null);
  };

  const handleComplete = async (offer: OffchainOffer) => {
    setCompletingId(offer.id);
    await completePurchase(offer.tokenId, BigInt(offer.priceWei));
    setCompletingId(null);
  };

  if (!isConnected) {
    return (
      <Card className="p-8 bg-black/40 border-white/10 text-center">
        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-orbitron text-white mb-2">Connect Wallet</h3>
        <p className="text-muted-foreground text-sm">Connect your wallet to view your offers</p>
      </Card>
    );
  }

  if (myOffers.length === 0) {
    return (
      <Card className="p-8 bg-black/40 border-white/10 text-center">
        <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-orbitron text-white mb-2">No Active Offers</h3>
        <p className="text-muted-foreground text-sm">
          You haven't made any offers yet. Browse the marketplace to make offers on NFTs!
        </p>
        <p className="text-cyan-400 text-xs mt-4">
          Making offers is FREE - funds stay in your wallet until seller accepts
        </p>
      </Card>
    );
  }

  const getStatusBadge = (offer: OffchainOffer) => {
    const now = Math.floor(Date.now() / 1000);
    
    if (offer.status === 'accepted') {
      const timeLeft = (offer.completionDeadline || 0) - now;
      if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / 3600);
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse">
            <Clock size={12} className="mr-1" />
            ACCEPTED - {hours}h to complete
          </Badge>
        );
      } else {
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            <AlertTriangle size={12} className="mr-1" />
            EXPIRED
          </Badge>
        );
      }
    }
    
    if (offer.status === 'completed') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
          <CheckCircle size={12} className="mr-1" />
          COMPLETED
        </Badge>
      );
    }
    
    if (offer.expiration < now) {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">
          EXPIRED
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
        <Clock size={12} className="mr-1" />
        PENDING
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-orbitron text-white flex items-center gap-2">
          <Gavel className="text-cyan-400" size={20} />
          MY OFFERS ({myOffers.length})
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refresh}
          disabled={isLoading}
          className="text-muted-foreground hover:text-white"
          data-testid="button-refresh-offers"
        >
          {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Refresh'}
        </Button>
      </div>

      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 mb-4">
        <p className="text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle size={14} />
          <span>Your funds stay in your wallet until you complete a purchase after seller accepts.</span>
        </p>
      </div>

      <div className="space-y-3">
        {myOffers.map((offer) => (
          <Card 
            key={offer.id} 
            className="p-4 bg-black/60 border-white/10 hover:border-cyan-500/30 transition-colors"
            data-testid={`offer-card-${offer.tokenId}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-bold font-orbitron">
                    Guardian #{offer.tokenId}
                  </span>
                  {getStatusBadge(offer)}
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Offer: </span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {Number(offer.price).toLocaleString()} $BASED
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Expires: {formatDistanceToNow(offer.expiration * 1000, { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {offer.status === 'accepted' && (
                  <Button 
                    size="sm"
                    onClick={() => handleComplete(offer)}
                    disabled={completingId === offer.id}
                    className="bg-green-500 text-black hover:bg-green-400 font-bold"
                    data-testid={`button-complete-${offer.tokenId}`}
                  >
                    {completingId === offer.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      'COMPLETE PURCHASE'
                    )}
                  </Button>
                )}
                
                {offer.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancel(offer)}
                    disabled={cancellingId === offer.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    data-testid={`button-cancel-${offer.tokenId}`}
                  >
                    {cancellingId === offer.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MyOffersPanel;
