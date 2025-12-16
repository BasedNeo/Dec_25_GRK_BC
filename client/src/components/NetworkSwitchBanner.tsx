import { useAccount, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { CHAIN_ID } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { switchToBasedAI, addBasedAINetwork } from '@/lib/networkHelper';

export function NetworkSwitchBanner() {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);
  const prevChainRef = useRef(chain?.id);
  
  useEffect(() => {
    if (prevChainRef.current !== chain?.id) {
      setDismissed(false);
      prevChainRef.current = chain?.id;
    }
  }, [chain?.id]);
  
  const showBanner = isConnected && chain?.id !== CHAIN_ID && !dismissed;
  if (!showBanner) return null;
  
  return (
    <AnimatePresence>
      <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <p className="font-bold font-orbitron text-sm">WRONG NETWORK DETECTED</p>
              <p className="text-xs text-white/80">You're on <span className="font-mono font-bold">{chain?.name || `Chain ${chain?.id}`}</span>. This dApp requires <span className="font-mono font-bold">BasedAI (32323)</span>.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={async () => {
              const success = await switchToBasedAI();
              if (!success) {
                await addBasedAINetwork();
              }
            }} disabled={isPending} className="bg-white text-red-600 hover:bg-white/90 font-bold font-orbitron text-sm px-4 py-2 h-auto">
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />SWITCHING...</> : <>⚡ SWITCH TO BASEDAI</>}
            </Button>
            <button onClick={() => setDismissed(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-red-500 to-orange-500 animate-pulse" />
      </motion.div>
    </AnimatePresence>
  );
}
