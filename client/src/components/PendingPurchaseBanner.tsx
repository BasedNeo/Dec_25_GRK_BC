import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useOffersV3 } from '@/hooks/useOffersV3';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PendingPurchaseBanner() {
  const { isConnected } = useAccount();
  const { myOffers, completePurchase, isLoading } = useOffersV3();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  
  const acceptedOffers = myOffers.filter(o => 
    o.status === 'accepted' && 
    !dismissed.has(o.id)
  );
  
  if (!isConnected || acceptedOffers.length === 0) return null;
  
  return (
    <AnimatePresence>
      {acceptedOffers.slice(0, 1).map((offer) => {
        const deadline = offer.completionDeadline || (offer.acceptedAt || 0) + 86400;
        const now = Math.floor(Date.now() / 1000);
        const hoursLeft = Math.max(0, Math.floor((deadline - now) / 3600));
        
        return (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-full px-4"
          >
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 backdrop-blur-xl shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <h4 className="font-orbitron text-amber-400 font-bold mb-1">OFFER ACCEPTED!</h4>
                  <p className="text-white text-sm mb-3">
                    Your offer on <strong>Guardian #{offer.tokenId}</strong> for{' '}
                    <strong className="text-amber-400">{Number(offer.price).toLocaleString()} $BASED</strong> was accepted!
                  </p>
                  <div className="flex items-center gap-2 text-amber-300 text-xs mb-3">
                    <Clock size={14} />
                    <span>Complete within <strong>{hoursLeft} hours</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => completePurchase(offer.tokenId, BigInt(offer.priceWei))}
                      disabled={isLoading}
                      className="bg-amber-500 text-black hover:bg-amber-400 font-bold flex-1"
                    >
                      COMPLETE PURCHASE
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDismissed(prev => new Set(prev).add(offer.id))}
                      className="text-amber-400 hover:bg-amber-500/10"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

export default PendingPurchaseBanner;
