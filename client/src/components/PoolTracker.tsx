import { MOCK_POOL_BALANCE } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Database, ArrowUpRight } from "lucide-react";

export function PoolTracker() {
  return (
    <section id="pool" className="py-24 bg-gradient-to-b from-background to-secondary/20 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-6 animate-pulse">
            <Database size={32} />
          </div>
          
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-[0.2em] mb-4">Community Treasury</h2>
          
          <div className="text-6xl md:text-8xl font-black text-white mb-6 font-orbitron text-glow">
            {MOCK_POOL_BALANCE.toLocaleString()}
          </div>
          
          <div className="text-2xl text-primary font-orbitron mb-12">$BASED</div>
          
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            51% of all mint proceeds are automatically deposited into the community pool. 
            This treasury is governed entirely by Based Guardian holders.
          </p>

          <a 
            href="#" 
            className="inline-flex items-center text-primary hover:text-accent transition-colors border-b border-primary/30 hover:border-accent pb-1 font-mono text-sm"
          >
            VIEW CONTRACT ON BASESCAN <ArrowUpRight size={14} className="ml-2" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
