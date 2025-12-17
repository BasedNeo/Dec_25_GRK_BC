import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Clock, X, Edit3, RefreshCw, CheckCircle2, AlertTriangle, 
  Loader2, ExternalLink, DollarSign, Timer, Gavel, Wallet
} from 'lucide-react';
import { useMyOffers, MyOffer } from '@/hooks/useMyOffers';
import { useOffersV3 } from '@/hooks/useOffersV3';
import { useToast } from '@/hooks/use-toast';
import { useButtonLock } from '@/hooks/useButtonLock';
import { NFTImage } from './NFTImage';
import { formatDistanceToNow } from 'date-fns';
import { BLOCK_EXPLORER, NFT_CONTRACT } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';

interface EditOfferModalProps {
  offer: MyOffer | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newAmount: number) => void;
  isSubmitting: boolean;
}

function EditOfferModal({ offer, isOpen, onClose, onSubmit, isSubmitting }: EditOfferModalProps) {
  const [newAmount, setNewAmount] = useState(offer?.amount || 0);

  if (!offer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 backdrop-blur-xl border-cyan-500/30 text-white sm:max-w-md" style={{ zIndex: 99999 }}>
        <DialogHeader>
          <DialogTitle className="font-orbitron flex items-center gap-2 text-cyan-400">
            <Edit3 size={18} /> EDIT OFFER
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
            <div className="w-16 h-16 rounded overflow-hidden border border-white/10">
              <NFTImage src={offer.nftImage} alt={offer.nftName} id={offer.tokenId} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-orbitron text-white">{offer.nftName}</h4>
              <p className="text-xs text-muted-foreground">Current: {offer.amount.toLocaleString()} $BASED</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-mono">NEW OFFER AMOUNT ($BASED)</label>
            <Input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(Number(e.target.value))}
              className="bg-white/5 border-white/10 text-white font-mono text-lg"
            />
          </div>
          
          {offer.isV3 ? (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-300">
              <CheckCircle2 size={14} className="inline mr-2" />
              V3 Offer: This will cancel the old signature and create a new one (FREE).
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
              <AlertTriangle size={14} className="inline mr-2" />
              This will cancel your current offer and create a new one. Gas fees apply.
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="border border-white/20">CANCEL</Button>
          <Button 
            onClick={() => onSubmit(newAmount)}
            disabled={isSubmitting || newAmount <= 0}
            className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
            UPDATE OFFER
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MyOffersPanel() {
  const { isConnected } = useAccount();
  const { 
    offers, 
    activeOffers, 
    acceptedOffers, 
    expiredOffers, 
    isLoading, 
    error,
    refresh, 
    cancelOffer,
    activeCount 
  } = useMyOffers();
  const offersV3 = useOffersV3();
  const { toast } = useToast();
  
  const [filter, setFilter] = useState<'all' | 'active' | 'accepted' | 'expired'>('all');
  const [editingOffer, setEditingOffer] = useState<MyOffer | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const { isLocked, withLock } = useButtonLock(3000);

  const handleCancel = async (offer: MyOffer) => {
    await withLock(async () => {
      setCancellingId(offer.tokenId);
      try {
        await cancelOffer(offer.tokenId, offer.isV3 || false, offer.v3Offer?.id);
        toast({
          title: "Offer Cancelled",
          description: `Your offer on ${offer.nftName} has been removed.`,
          className: "bg-black border-green-500 text-green-400"
        });
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Cancel Failed",
          description: error.message || "Could not cancel offer",
          variant: "destructive"
        });
      } finally {
        setCancellingId(null);
      }
    });
  };

  const handleEdit = async (newAmount: number) => {
    if (!editingOffer) return;
    
    await withLock(async () => {
      setIsEditSubmitting(true);
      try {
        if (editingOffer.isV3 && editingOffer.v3Offer) {
          await offersV3.cancelOffer(editingOffer.v3Offer.id);
          await offersV3.makeOffer(editingOffer.tokenId, newAmount, 7);
        } else {
          await cancelOffer(editingOffer.tokenId, false);
        }
        
        toast({
          title: "Offer Updated",
          description: `New offer of ${newAmount.toLocaleString()} $BASED submitted.`,
          className: "bg-black border-green-500 text-green-400"
        });
        setEditingOffer(null);
        refresh();
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Update Failed",
          description: error.message || "Could not update offer",
          variant: "destructive"
        });
      } finally {
        setIsEditSubmitting(false);
      }
    });
  };

  const filteredOffers = filter === 'all' 
    ? offers 
    : filter === 'active' 
      ? activeOffers 
      : filter === 'accepted' 
        ? acceptedOffers 
        : expiredOffers;

  const getStatusBadge = (status: MyOffer['status'], isV3?: boolean) => {
    const v3Badge = isV3 ? <span className="ml-1 text-[8px] opacity-60">V3</span> : null;
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Active{v3Badge}</Badge>;
      case 'accepted':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 animate-pulse">Accepted!{v3Badge}</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Expired{v3Badge}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Cancelled{v3Badge}</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt < now) return 'Expired';
    
    const diff = expiresAt - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${Math.floor((diff % 3600) / 60)}m`;
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
        <p className="text-muted-foreground font-mono text-sm">Loading your offers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed border-red-500/30 rounded-xl">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 font-mono text-sm mb-4">{error}</p>
        <Button onClick={refresh} variant="outline" className="border-red-500/50 text-red-400">
          <RefreshCw size={14} className="mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-orbitron text-white flex items-center gap-2">
            <Gavel className="text-cyan-400" size={20} />
            MY OFFERS
            {activeCount > 0 && (
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 ml-2">
                {activeCount} Active
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage offers you've made on NFTs
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refresh}
          className="border-white/10 text-white hover:bg-white/5"
          data-testid="button-refresh-my-offers"
        >
          <RefreshCw size={14} className="mr-2" /> Refresh
        </Button>
      </div>

      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
        <p className="text-xs text-green-300 flex items-center gap-2">
          <CheckCircle2 size={14} />
          V3 Offers are FREE (signature only). Your funds stay in your wallet until purchase completes.
        </p>
      </div>
      
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 w-full justify-start">
          <TabsTrigger value="all" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            All ({offers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Active ({activeOffers.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            Accepted ({acceptedOffers.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="data-[state=active]:bg-gray-500/20 data-[state=active]:text-gray-400">
            Expired ({expiredOffers.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {filteredOffers.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredOffers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10 hover:border-cyan-500/30 transition-all p-4" data-testid={`my-offer-card-${offer.tokenId}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                      <NFTImage 
                        src={offer.nftImage} 
                        alt={offer.nftName} 
                        id={offer.tokenId}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-orbitron text-white truncate">{offer.nftName}</h4>
                        {getStatusBadge(offer.status, offer.isV3)}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-cyan-400" />
                          <span className="text-white font-mono font-bold">
                            {offer.amount.toLocaleString()} $BASED
                          </span>
                        </div>
                        
                        {offer.status === 'active' && (
                          <div className="flex items-center gap-1">
                            <Timer size={14} className="text-amber-400" />
                            <span className="text-muted-foreground font-mono">
                              {getTimeRemaining(offer.expiresAt)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-muted-foreground" />
                          <span className="text-muted-foreground text-xs">
                            {offer.createdAt ? formatDistanceToNow(offer.createdAt * 1000, { addSuffix: true }) : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      {offer.v3Offer?.message && (
                        <div className="mt-2 p-2 bg-purple-500/10 border-l-2 border-purple-500 rounded-r text-xs">
                          <span className="text-purple-400 font-bold">Your message: </span>
                          <span className="text-white/70 italic">"{offer.v3Offer.message}"</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                      {offer.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingOffer(offer)}
                            className="flex-1 sm:flex-none border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                            data-testid={`button-edit-offer-${offer.tokenId}`}
                          >
                            <Edit3 size={14} className="mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(offer)}
                            disabled={cancellingId === offer.tokenId || isLocked}
                            className="flex-1 sm:flex-none border-red-500/30 text-red-400 hover:bg-red-500/10"
                            data-testid={`button-cancel-offer-${offer.tokenId}`}
                          >
                            {cancellingId === offer.tokenId ? (
                              <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                              <X size={14} className="mr-1" />
                            )}
                            Cancel
                          </Button>
                        </>
                      )}
                      
                      {offer.status === 'accepted' && offer.isV3 && offer.v3Offer && (
                        <Button
                          size="sm"
                          onClick={() => offersV3.completePurchase(offer.tokenId, BigInt(offer.v3Offer!.priceWei))}
                          className="flex-1 sm:flex-none bg-green-500 text-black hover:bg-green-400 font-bold"
                          data-testid={`button-complete-purchase-${offer.tokenId}`}
                        >
                          <CheckCircle2 size={14} className="mr-1" /> Complete Purchase
                        </Button>
                      )}
                      
                      <a
                        href={`${BLOCK_EXPLORER}/token/${NFT_CONTRACT}?a=${offer.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/5 rounded border border-white/10"
                        title="View on Explorer"
                      >
                        <ExternalLink size={14} className="text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/10 rounded-xl bg-white/5">
          <DollarSign className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h4 className="text-lg font-orbitron text-white mb-2">No Offers Found</h4>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            {filter === 'all' 
              ? "You haven't made any offers yet. Browse the marketplace to find NFTs you want!"
              : `No ${filter} offers to display.`
            }
          </p>
        </div>
      )}
      
      <EditOfferModal
        offer={editingOffer}
        isOpen={!!editingOffer}
        onClose={() => setEditingOffer(null)}
        onSubmit={handleEdit}
        isSubmitting={isEditSubmitting}
      />
    </div>
  );
}

export default MyOffersPanel;
