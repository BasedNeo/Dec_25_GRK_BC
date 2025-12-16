import { motion } from "framer-motion";
import { 
  Globe, 
  Sparkles, 
  Wallet, 
  Vote, 
  Grid3X3, 
  Droplets,
  Activity,
  ChevronRight,
  Zap
} from "lucide-react";
import Untitled from "@assets/Untitled.png";

interface HomeHubProps {
  onNavigate: (tab: string) => void;
}

const menuItems = [
  { 
    id: 'gallery', 
    label: 'PORTFOLIO', 
    icon: Wallet, 
    description: 'View your NFT collection',
    color: 'from-emerald-500 to-cyan-500',
    glow: 'emerald'
  },
  { 
    id: 'escrow', 
    label: 'COLLECTION', 
    icon: Grid3X3, 
    description: 'Browse & trade on marketplace',
    color: 'from-violet-500 to-purple-500',
    glow: 'violet'
  },
  { 
    id: 'universe', 
    label: 'UNIVERSE', 
    icon: Globe, 
    description: 'Explore the Based Guardians lore',
    color: 'from-blue-500 to-indigo-500',
    glow: 'blue'
  },
  { 
    id: 'pool', 
    label: 'POOL', 
    icon: Droplets, 
    description: 'Track community emissions',
    color: 'from-cyan-500 to-blue-500',
    glow: 'cyan'
  },
  { 
    id: 'voting', 
    label: 'VOTING', 
    icon: Vote, 
    description: 'Participate in DAO governance',
    color: 'from-amber-500 to-orange-500',
    glow: 'amber'
  },
  { 
    id: 'mint', 
    label: 'MINT', 
    icon: Sparkles, 
    description: 'Mint your Guardian NFT',
    color: 'from-cyan-400 to-teal-500',
    glow: 'cyan'
  },
  { 
    id: 'activity', 
    label: 'ACTIVITY', 
    icon: Activity, 
    description: 'Live transaction feed',
    color: 'from-rose-500 to-pink-500',
    glow: 'rose'
  },
];

export function HomeHub({ onNavigate }: HomeHubProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.03)_0%,transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <motion.div 
        className="w-full max-w-2xl relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="text-center mb-10"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
        >
          <motion.img 
            src={Untitled}
            alt="Based Guardians"
            className="h-24 w-auto mx-auto mb-6 drop-shadow-[0_0_30px_rgba(0,255,255,0.6)]"
            animate={{ 
              y: [0, -8, 0],
              filter: ['drop-shadow(0 0 30px rgba(0,255,255,0.6))', 'drop-shadow(0 0 40px rgba(0,255,255,0.8))', 'drop-shadow(0 0 30px rgba(0,255,255,0.6))']
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] text-white mb-3">
            <span className="bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">
              COMMAND CENTER
            </span>
          </h1>
          <p className="text-xs text-white/40 font-mono tracking-[0.3em] uppercase">
            Select your destination
          </p>
        </motion.div>

        <div className="space-y-2.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full group relative"
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 + index * 0.06, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.015, x: 4 }}
                whileTap={{ scale: 0.99 }}
                data-testid={`hub-nav-${item.id}`}
              >
                <div className={`
                  absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 
                  group-hover:opacity-15 rounded-2xl transition-all duration-500
                  blur-2xl scale-105
                `} />
                
                <div className="relative flex items-center justify-between p-5 rounded-2xl 
                  bg-gradient-to-br from-white/[0.03] to-transparent
                  border border-white/[0.06] backdrop-blur-xl
                  group-hover:border-white/20 group-hover:from-white/[0.06]
                  group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
                  transition-all duration-400">
                  
                  <div className="flex items-center gap-5">
                    <div className={`
                      p-3 rounded-xl bg-gradient-to-br ${item.color}
                      shadow-lg group-hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] 
                      group-hover:scale-110 transition-all duration-300
                    `}>
                      <Icon className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>
                    
                    <div className="text-left">
                      <h3 className="font-bold text-white/90 tracking-[0.15em] text-sm md:text-base
                        group-hover:text-white transition-colors duration-300">
                        {item.label}
                      </h3>
                      <p className="text-[11px] text-white/30 font-mono tracking-wide
                        group-hover:text-white/50 transition-colors duration-300">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-white/20 
                    group-hover:text-white/60 group-hover:translate-x-1.5 
                    transition-all duration-300" />
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div 
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full 
            bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 
            border border-white/[0.05] backdrop-blur-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
            <span className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
              Powered by BasedAI L1
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
