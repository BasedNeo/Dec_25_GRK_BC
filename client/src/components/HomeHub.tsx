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
    id: 'universe', 
    label: 'UNIVERSE', 
    icon: Globe, 
    description: 'Explore the Based Guardians lore',
    color: 'from-purple-500 to-blue-500',
    glow: 'purple'
  },
  { 
    id: 'mint', 
    label: 'MINT', 
    icon: Sparkles, 
    description: 'Mint your Guardian NFT',
    color: 'from-cyan-500 to-teal-500',
    glow: 'cyan'
  },
  { 
    id: 'gallery', 
    label: 'PORTFOLIO', 
    icon: Wallet, 
    description: 'View your NFT collection',
    color: 'from-green-500 to-emerald-500',
    glow: 'green'
  },
  { 
    id: 'voting', 
    label: 'VOTING', 
    icon: Vote, 
    description: 'Participate in DAO governance',
    color: 'from-yellow-500 to-orange-500',
    glow: 'yellow'
  },
  { 
    id: 'escrow', 
    label: 'COLLECTION', 
    icon: Grid3X3, 
    description: 'Browse & trade on marketplace',
    color: 'from-pink-500 to-rose-500',
    glow: 'pink'
  },
  { 
    id: 'pool', 
    label: 'POOL', 
    icon: Droplets, 
    description: 'Track community emissions',
    color: 'from-blue-500 to-indigo-500',
    glow: 'blue'
  },
  { 
    id: 'activity', 
    label: 'ACTIVITY', 
    icon: Activity, 
    description: 'Live transaction feed',
    color: 'from-red-500 to-pink-500',
    glow: 'red'
  },
];

export function HomeHub({ onNavigate }: HomeHubProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-8">
      <motion.div 
        className="w-full max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.img 
            src={Untitled}
            alt="Based Guardians"
            className="h-20 w-auto mx-auto mb-4 drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]"
            animate={{ 
              y: [0, -5, 0],
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-white mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              COMMAND CENTER
            </span>
          </h1>
          <p className="text-xs text-muted-foreground font-mono tracking-widest">
            SELECT YOUR DESTINATION
          </p>
        </motion.div>

        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full group relative"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`hub-nav-${item.id}`}
              >
                <div className={`
                  absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 
                  group-hover:opacity-20 rounded-xl transition-opacity duration-300
                  blur-xl
                `} />
                
                <div className="relative flex items-center justify-between p-4 rounded-xl 
                  bg-black/60 border border-white/10 backdrop-blur-sm
                  group-hover:border-white/30 group-hover:bg-black/80
                  transition-all duration-300">
                  
                  <div className="flex items-center gap-4">
                    <div className={`
                      p-2.5 rounded-lg bg-gradient-to-br ${item.color}
                      shadow-lg group-hover:shadow-xl transition-shadow
                    `}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="text-left">
                      <h3 className="font-bold text-white tracking-wider text-sm md:text-base
                        group-hover:text-transparent group-hover:bg-gradient-to-r 
                        group-hover:${item.color} group-hover:bg-clip-text transition-all">
                        {item.label}
                      </h3>
                      <p className="text-[10px] md:text-xs text-muted-foreground/70 font-mono">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 
                    group-hover:text-white group-hover:translate-x-1 
                    transition-all duration-300" />
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
            bg-gradient-to-r from-cyan-500/10 to-purple-500/10 
            border border-white/5">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
              POWERED BY BASEDAI L1
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
