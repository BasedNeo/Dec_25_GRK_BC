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
  Shield,
  Trophy,
  Rocket,
  Lock,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useLocation } from "wouter";
import { ADMIN_WALLETS } from "@/lib/constants";
import Untitled from "@assets/Untitled.png";
import { useTranslation } from "react-i18next";

interface HomeHubProps {
  onNavigate: (tab: string) => void;
  onOpenAdmin?: () => void;
}

export function HomeHub({ onNavigate, onOpenAdmin }: HomeHubProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { address } = useAccount();
  const isAdmin = address && ADMIN_WALLETS.some(admin => admin.toLowerCase() === address.toLowerCase());

  const menuItems = [
    { 
      id: 'mint', 
      label: t('hub.mintLabel', 'Mint - Lift Off!'), 
      icon: Sparkles, 
      description: t('hub.mintDesc', 'Mint your Guardian NFT'),
      color: 'from-cyan-400 to-teal-500',
      glow: 'cyan'
    },
    { 
      id: 'escrow', 
      label: t('hub.marketLabel', 'Market'), 
      icon: Grid3X3, 
      description: t('hub.marketDesc', 'Browse & trade on marketplace'),
      color: 'from-violet-500 to-purple-500',
      glow: 'violet'
    },
    { 
      id: 'gallery', 
      label: t('hub.portfolioLabel', 'Portfolio'), 
      icon: Wallet, 
      description: t('hub.portfolioDesc', 'View your NFT collection'),
      color: 'from-emerald-500 to-cyan-500',
      glow: 'emerald'
    },
    { 
      id: 'pool', 
      label: t('hub.poolLabel', 'Pool'), 
      icon: Droplets, 
      description: t('hub.poolDesc', 'Track community emissions'),
      color: 'from-cyan-500 to-blue-500',
      glow: 'cyan'
    },
    { 
      id: 'stats', 
      label: t('hub.statsLabel', 'User Stats'), 
      icon: Trophy, 
      description: t('hub.statsDesc', 'Your Guardian journey'),
      color: 'from-purple-500 to-pink-500',
      glow: 'purple'
    },
    { 
      id: 'games', 
      label: t('hub.gameLabel', 'Arcade'), 
      icon: Rocket, 
      description: t('hub.gameDesc', 'The Based Odyssey arcade'),
      color: 'from-orange-500 to-red-500',
      glow: 'orange',
      isRoute: true,
      route: '/games'
    },
    { 
      id: 'activity', 
      label: t('hub.activityLabel', 'Activity'), 
      icon: Activity, 
      description: t('hub.activityDesc', 'Live transaction feed'),
      color: 'from-rose-500 to-pink-500',
      glow: 'rose'
    },
    { 
      id: 'voting', 
      label: t('hub.votingLabel', 'Voting'), 
      icon: Vote, 
      description: t('hub.votingDesc', 'Participate in governance'),
      color: 'from-amber-500 to-orange-500',
      glow: 'amber'
    },
    { 
      id: 'universe', 
      label: t('hub.universeLabel', 'Universe'), 
      icon: Globe, 
      description: t('hub.universeDesc', 'Explore the Based Guardians lore'),
      color: 'from-blue-500 to-indigo-500',
      glow: 'blue'
    },
    { 
      id: 'escrow-coming', 
      label: 'Escrow', 
      icon: Lock, 
      description: 'Coming Soon',
      color: 'from-gray-600 to-gray-700',
      glow: 'gray',
      disabled: true
    },
  ];

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
            className="h-28 w-auto mx-auto mb-6 drop-shadow-[0_0_30px_rgba(0,255,255,0.6)]"
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
            <span 
              className="bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]"
              style={{
                backgroundImage: 'linear-gradient(90deg, #22d3ee, #ffffff, #a78bfa, #ffffff, #22d3ee)',
                backgroundSize: '200% 100%',
                animation: 'gradientShift 8s ease-in-out infinite',
              }}
            >
              COMMAND CENTER
            </span>
          </h1>
          <style>{`
            @keyframes gradientShift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
          <p className="text-xs text-white/40 font-mono tracking-[0.3em] uppercase">
            Select your destination
          </p>
        </motion.div>

        <div className="space-y-2.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isDisabled = 'disabled' in item && item.disabled;
            
            return (
              <motion.button
                key={item.id}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  item.isRoute ? setLocation(item.route!) : onNavigate(item.id);
                }}
                aria-disabled={isDisabled}
                className={`w-full group relative ${isDisabled ? 'cursor-not-allowed' : ''}`}
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: isDisabled ? 0.5 : 1 }}
                transition={{ delay: 0.15 + index * 0.06, type: "spring", stiffness: 100 }}
                whileHover={isDisabled ? {} : { scale: 1.015, x: 4 }}
                whileTap={isDisabled ? {} : { scale: 0.99 }}
                data-testid={`hub-nav-${item.id}`}
                disabled={isDisabled}
              >
                <div className={`
                  absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 
                  ${!isDisabled ? 'group-hover:opacity-15' : ''} rounded-2xl transition-all duration-500
                  blur-2xl scale-105
                `} />
                
                <div 
                  className={`relative flex items-center justify-between py-3 px-4 rounded-xl 
                  border border-white/10
                  ${!isDisabled ? 'group-hover:border-white/20 group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]' : ''}
                  transition-all duration-400 flex-nowrap`}
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
                  
                  <div className="flex items-center gap-4 flex-shrink min-w-0">
                    <div className={`
                      p-2.5 rounded-xl bg-gradient-to-br ${item.color}
                      shadow-lg ${!isDisabled ? 'group-hover:shadow-[0_0_25px_rgba(0,0,0,0.3)] group-hover:scale-110' : 'grayscale'} transition-all duration-300 flex-shrink-0
                    `}>
                      <Icon className={`w-5 h-5 ${isDisabled ? 'text-white/50' : 'text-white'} drop-shadow-lg`} />
                    </div>
                    
                    <div className="text-left min-w-0">
                      <h3 className={`font-bold tracking-[0.12em] text-sm truncate ${isDisabled ? 'text-white/40' : 'text-white/90 group-hover:text-white'} transition-colors duration-300`}>
                        {item.label}
                      </h3>
                      <p className={`text-[10px] font-mono tracking-wide truncate ${isDisabled ? 'text-white/20' : 'text-white/30 group-hover:text-white/50'} transition-colors duration-300`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  {isDisabled ? (
                    <span className="text-[9px] font-mono text-white/30 bg-white/5 px-2 py-1 rounded-full flex-shrink-0 ml-2">
                      SOON
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 ml-2
                      group-hover:text-white/60 group-hover:translate-x-1 
                      transition-all duration-300" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Admin Button - Only visible to admin wallets */}
        {isAdmin && onOpenAdmin && (
          <motion.button
            onClick={onOpenAdmin}
            className="w-full group relative mt-6"
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.015, x: 4 }}
            whileTap={{ scale: 0.99 }}
            data-testid="hub-nav-admin"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-0 
              group-hover:opacity-15 rounded-2xl transition-all duration-500
              blur-2xl scale-105" />
            
            <div className="relative flex items-center justify-between p-5 rounded-2xl 
              bg-gradient-to-br from-red-500/10 to-transparent
              border border-red-500/30 backdrop-blur-xl
              group-hover:border-red-400/50 group-hover:from-red-500/20
              group-hover:shadow-[0_8px_40px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]
              transition-all duration-400">
              
              <div className="flex items-center gap-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-orange-500
                  shadow-lg group-hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] 
                  group-hover:scale-110 transition-all duration-300">
                  <Shield className="w-5 h-5 text-white drop-shadow-lg" />
                </div>
                
                <div className="text-left">
                  <h3 className="font-bold text-red-400 tracking-[0.15em] text-sm md:text-base
                    group-hover:text-red-300 transition-colors duration-300">
                    ADMIN PANEL
                  </h3>
                  <p className="text-[11px] text-red-400/50 font-mono tracking-wide
                    group-hover:text-red-400/70 transition-colors duration-300">
                    Manage proposals & system
                  </p>
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 text-red-400/40 
                group-hover:text-red-400/80 group-hover:translate-x-1.5 
                transition-all duration-300" />
            </div>
          </motion.button>
        )}

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
