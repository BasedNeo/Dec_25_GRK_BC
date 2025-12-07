import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Grid, Lock } from "lucide-react";
import { MOCK_GUARDIANS, Guardian } from "@/lib/mockData";

interface NFTGalleryProps {
  isConnected: boolean;
  onConnect: () => void;
}

export function NFTGallery({ isConnected, onConnect }: NFTGalleryProps) {
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
          
          {isConnected && (
            <div className="mt-4 md:mt-0 px-4 py-2 bg-primary/10 border border-primary/30 rounded text-primary font-orbitron text-sm">
              TOTAL OWNED: <span className="text-white ml-2">4</span>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
            <Lock className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-orbitron text-white mb-2">WALLET LOCKED</h3>
            <p className="text-muted-foreground mb-6">Connect your wallet to view your Guardian collection.</p>
            <Button 
              onClick={onConnect}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-orbitron tracking-wider"
            >
              CONNECT TO VIEW
            </Button>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {MOCK_GUARDIANS.map((guardian) => (
              <motion.div key={guardian.id} variants={item}>
                <GuardianCard guardian={guardian} />
              </motion.div>
            ))}
          </motion.div>
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
        <img 
          src={guardian.image} 
          alt={guardian.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        <div className="absolute top-2 right-2 z-20">
          <Badge variant={guardian.rarity === 'Legendary' ? 'default' : 'secondary'} className="font-mono text-xs uppercase">
            {guardian.rarity}
          </Badge>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="text-lg text-white mb-3">{guardian.name}</h4>
        
        <div className="space-y-2">
          {guardian.traits.slice(0, 3).map((trait, i) => (
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
