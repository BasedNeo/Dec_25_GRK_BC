import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { 
  Globe, 
  Sparkles, 
  Wallet, 
  Vote, 
  Grid3X3, 
  Droplets,
  Activity,
  ChevronRight,
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

function LightspeedStarfield({ active }: { active: boolean }) {
  const stars = useMemo(() => 
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      startY: Math.random() * 100,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.5,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            width: active ? star.size * 0.5 : star.size,
            height: active ? star.size * 20 : star.size,
            boxShadow: active 
              ? `0 0 ${star.size * 4}px rgba(255,255,255,0.8), 0 0 ${star.size * 8}px rgba(0,255,255,0.4)`
              : `0 0 ${star.size}px rgba(255,255,255,0.3)`,
          }}
          initial={{ top: `${star.startY}%`, opacity: 0.6 }}
          animate={active ? {
            top: ["0%", "120%"],
            opacity: [0, 1, 1, 0],
          } : {
            top: `${star.startY}%`,
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={active ? {
            duration: 0.3 * star.speed,
            repeat: Infinity,
            ease: "linear",
          } : {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      
      {active && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-purple-500/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </div>
  );
}

export function HomeHub({ onNavigate }: HomeHubProps) {
  const [isLightspeed, setIsLightspeed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rocketOffset, setRocketOffset] = useState(0);
  
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 600, damping: 25 });
  
  const rocketScale = useTransform(springY, [0, 50], [1, 0.9]);
  const glowIntensity = useTransform(springY, [0, 50], [0.6, 1]);
  
  const handleDragEnd = useCallback(() => {
    const currentY = y.get();
    setIsDragging(false);
    y.set(0);
    
    if (currentY > 10 && !isLightspeed) {
      setRocketOffset(-50);
      setIsLightspeed(true);
      
      setTimeout(() => {
        setRocketOffset(0);
      }, 300);
      
      setTimeout(() => {
        setIsLightspeed(false);
      }, 2500);
    }
  }, [y, isLightspeed]);

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <LightspeedStarfield active={isLightspeed} />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.03)_0%,transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {isLightspeed && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-500/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-purple-500/20 to-transparent" />
        </motion.div>
      )}
      
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
          <motion.div
            className="relative inline-block cursor-grab active:cursor-grabbing select-none touch-none"
            drag="y"
            dragConstraints={{ top: 0, bottom: 25 }}
            dragElastic={0.02}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ y: springY }}
          >
            <motion.div
              className="relative p-4 -m-4"
              animate={{ y: rocketOffset }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <motion.img 
                src={Untitled}
                alt="Based Guardians - Pull to launch!"
                className="h-20 md:h-24 w-auto mx-auto pointer-events-none"
                style={{
                  scale: rocketScale,
                }}
                animate={!isDragging && !isLightspeed ? { 
                  y: [0, -6, 0],
                  filter: [
                    'drop-shadow(0 0 25px rgba(0,255,255,0.5))',
                    'drop-shadow(0 0 35px rgba(0,255,255,0.7))',
                    'drop-shadow(0 0 25px rgba(0,255,255,0.5))'
                  ]
                } : isLightspeed ? {
                  filter: 'drop-shadow(0 0 50px rgba(0,255,255,1))'
                } : {}}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
            
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-400 whitespace-nowrap"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  Release to launch!
                </motion.div>
              )}
            </AnimatePresence>
            
            {!isDragging && !isLightspeed && (
              <motion.div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="text-[9px] font-mono text-white/40 tracking-wider mb-1">PULL DOWN</div>
                <motion.div
                  animate={{ y: [0, 3, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/30"
                />
              </motion.div>
            )}
          </motion.div>
          
          <motion.h1 
            className="text-3xl md:text-4xl font-bold tracking-[0.2em] text-white mb-3 mt-4"
            animate={isLightspeed ? {
              textShadow: [
                "0 0 30px rgba(0,255,255,0.3)",
                "0 0 60px rgba(0,255,255,0.6)",
                "0 0 30px rgba(0,255,255,0.3)",
              ]
            } : {}}
            transition={{ duration: 0.3, repeat: isLightspeed ? Infinity : 0 }}
          >
            <span className="bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">
              COMMAND CENTER
            </span>
          </motion.h1>
          <p className="text-xs text-white/40 font-mono tracking-[0.3em] uppercase">
            {isLightspeed ? "ENGAGING LIGHTSPEED..." : "Select your destination"}
          </p>
        </motion.div>

        <motion.div 
          className="space-y-2.5"
          animate={isLightspeed ? { opacity: 0.5, scale: 0.98 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
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
        </motion.div>

        <motion.div 
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full 
            bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 
            border border-white/[0.05] backdrop-blur-xl">
            <div className={`w-1.5 h-1.5 rounded-full ${isLightspeed ? 'bg-green-400' : 'bg-cyan-400'} animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.5)]`} />
            <span className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
              {isLightspeed ? "Warp Drive Active" : "Powered by BasedAI L1"}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
