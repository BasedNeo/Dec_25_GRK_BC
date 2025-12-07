import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { Guardian, MOCK_GUARDIANS } from "@/lib/mockData";
import { useAccount } from "wagmi";
import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useGuardians } from "@/hooks/useGuardians";

interface NFTGalleryProps {
  isConnected: boolean; // Kept for legacy
  onConnect: () => void; // Kept for legacy
}

export function NFTGallery({ isConnected: _isConnected, onConnect: _onConnect }: NFTGalleryProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [useMockData, setUseMockData] = useState(false);

  const { data: nfts, isLoading } = useGuardians(useMockData);

  const displayNfts = (nfts && nfts.length > 0) ? nfts : (useMockData ? MOCK_GUARDIANS : []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <section id="gallery" className="py-20 bg-black/50 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl text-white mb-2">YOUR <span className="text-primary">BATTALION</span></h2>
            <p className="text-muted-foreground font-rajdhani">Manage your Guardians and view their traits.</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {isConnected && (
               <div className="flex items-center gap-2">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setUseMockData(!useMockData)}
                   className="text-xs border-white/20"
                 >
                   {useMockData ? "Switch to Real" : "View Demo Data"}
                 </Button>
                 <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded text-primary font-orbitron text-sm">
                   TOTAL OWNED: <span className="text-white ml-2">{displayNfts.length}</span>
                 </div>
               </div>
            )}
          </div>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
            <Lock className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-orbitron text-white mb-2">WALLET LOCKED</h3>
            <p className="text-muted-foreground mb-6">Connect your wallet to view your Guardian collection.</p>
            <Button 
              onClick={openConnectModal}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-orbitron tracking-wider"
            >
              CONNECT TO VIEW
            </Button>
          </div>
        ) : (
          <>
            {isLoading && !useMockData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            ) : displayNfts.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                 <p className="text-muted-foreground mb-4">No Guardians found in this wallet.</p>
                 <Button onClick={() => setUseMockData(true)} variant="outline">Load Demo Data</Button>
               </div>
            ) : (
              <motion.div 
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {displayNfts.map((guardian, idx) => (
                  <motion.div key={guardian.id || idx} variants={item}>
                    <GuardianCard guardian={guardian} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function GuardianCard({ guardian }: { guardian: Guardian }) {
  return (
    <Card className="bg-card border-white/10 overflow-hidden hover:border-primary/50 transition-colors duration-300 group">
      <div className="relative aspect-square overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {guardian.image ? (
          <img 
            src={guardian.image} 
            alt={guardian.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
           <div className="w-full h-full bg-secondary flex items-center justify-center">
             <span className="text-muted-foreground">No Image</span>
           </div>
        )}
        <div className="absolute top-2 right-2 z-20">
          <Badge variant={guardian.rarity === 'Legendary' || guardian.rarity === 'Rare' ? 'default' : 'secondary'} className="font-mono text-xs uppercase">
            {guardian.rarity || 'Common'}
          </Badge>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="text-lg text-white mb-3">{guardian.name}</h4>
        
        <div className="space-y-2">
          {guardian.traits && guardian.traits.slice(0, 3).map((trait, i) => (
            <div key={i} className="flex justify-between text-xs border-b border-white/5 pb-1 last:border-0 last:pb-0">
              <span className="text-muted-foreground">{trait.type}</span>
              <span className="text-primary font-medium">{trait.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
