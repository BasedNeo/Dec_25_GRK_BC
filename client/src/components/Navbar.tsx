import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ShieldAlert, PlayCircle, PauseCircle, Award, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useSecurity } from "@/context/SecurityContext";
import { ADMIN_WALLET } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import rocketLogo from '@assets/generated_images/neon_cyan_rocket_with_simple_flame_on_black.png';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isConnected: boolean; 
}

import { useTokenPrice } from "@/hooks/useTokenPrice";

import Untitled from "@assets/Untitled.png";

export function Navbar({ activeTab, onTabChange, isConnected }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const { toast } = useToast();
  const { address, isConnected: wagmiConnected } = useAccount();
  
  const handleLogoClick = () => {
    setIsShaking(true);
    onTabChange('mint');
    setTimeout(() => setIsShaking(false), 500); // Shake for 500ms
  };

  const { isPaused, togglePause } = useSecurity();
  const isAdmin = address?.toLowerCase() === ADMIN_WALLET.toLowerCase();
  
  // Price Data
  const { data: priceData } = useTokenPrice();
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) {
        toast({ title: "Install Not Available", description: "Your browser might not support PWA installation or it's already installed." });
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        trackEvent('pwa_install_accepted', 'Engagement', 'Navbar');
      }
      setDeferredPrompt(null);
    });
  };

  // Badge State
  const [badges, setBadges] = useState<{topVoter: boolean, eliteSeller: boolean}>({ topVoter: false, eliteSeller: false });

  // Confetti on first connect
  useEffect(() => {
    if (wagmiConnected) {
      const hasConnectedBefore = localStorage.getItem('has_connected_before');
      if (!hasConnectedBefore) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.2 },
          colors: ['#00ffff', '#bf00ff', '#ffffff']
        });
        localStorage.setItem('has_connected_before', 'true');
        trackEvent('wallet_connected_first_time', 'Engagement', 'Navbar');
      }
    }
  }, [wagmiConnected]);

  useEffect(() => {
    // Check for badges on mount/update
    const votes = parseInt(localStorage.getItem('user_votes') || '0');
    const sales = parseInt(localStorage.getItem('user_sales') || '0');
    setBadges({
        topVoter: votes >= 10,
        eliteSeller: sales >= 5
    });
  }, [address, activeTab]); // Re-check when tab changes as user might have performed actions

  const navItems = [
    { id: 'universe', label: 'UNIVERSE' },
    { id: 'mint', label: 'MINT' },
    { id: 'gallery', label: 'PORTFOLIO' },
    { id: 'voting', label: 'VOTING' }, 
    { id: 'escrow', label: 'COLLECTION' },
    { id: 'pool', label: 'POOL' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div 
            className="flex-shrink-0 cursor-pointer group flex items-center gap-4 outline-none select-none"
            onClick={handleLogoClick}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative">
              <img 
                src={Untitled}
                alt="Based Guardians Rocket" 
                className={`h-14 w-auto object-contain relative z-10 mix-blend-screen transition-all ${
                  isShaking ? 'animate-[mild-shake_0.1s_ease-in-out_infinite]' : 'group-hover:animate-[mild-shake_0.2s_ease-in-out_infinite]'
                }`}
              />
            </div>
            {isPaused && (
                <Badge variant="destructive" className="animate-pulse border-red-500 bg-red-900/50 text-red-500">
                    <ShieldAlert className="w-3 h-3 mr-1" /> SYSTEM PAUSED
                </Badge>
            )}
            <Badge variant="outline" className="hidden md:flex border-red-500/50 text-red-500 text-[10px] tracking-widest font-mono ml-[-10px] mt-[-20px] rotate-12 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                BETA
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {[
              { id: 'universe', label: 'UNIVERSE' },
              { id: 'mint', label: 'MINT' },
              { id: 'gallery', label: 'PORTFOLIO' },
              { id: 'voting', label: 'VOTING' }, 
              { id: 'escrow', label: 'COLLECTION' },
              { id: 'pool', label: 'POOL' },
            ].map((item) => (
              <button
                key={item.id}
                id={item.id === 'voting' ? 'nav-vote' : undefined}
                onClick={() => onTabChange(item.id)}
                className={`relative px-4 py-2 font-orbitron text-sm tracking-widest transition-colors ${
                  activeTab === item.id ? 'text-primary' : 'text-foreground/80 hover:text-white'
                }`}
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-md -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {item.label}
              </button>
            ))}
            
            <div className="flex items-center gap-2 ml-4 price-feed-container flex-shrink-0">
               {/* Unified Price Feed - Visible on ALL screens */}
               <div 
                 id="priceBadge"
                 className="flex flex-col justify-center px-3 py-1.5 rounded-md border border-white/10 bg-black/40 backdrop-blur-md transition-colors min-w-[140px]"
               >
                  {/* Row 1: BASED (ETH) */}
                  <div className="flex items-center justify-between gap-3 text-[10px] leading-tight">
                      <div className="flex items-center gap-1">
                          <span className="text-muted-foreground font-mono font-bold">$BASED (ETH):</span>
                          <span className="font-bold text-white font-mono">
                            {priceData ? `$${priceData.ethPrice.toFixed(4)}` : <div className="h-3 w-12 rounded skeleton inline-block align-middle" />}
                          </span>
                      </div>
                      {priceData ? (
                        <span className={`font-bold font-mono ${priceData.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {priceData.change >= 0 ? '▲' : '▼'} {Math.abs(priceData.change).toFixed(1)}%
                        </span>
                      ) : (
                        <div className="h-3 w-10 rounded skeleton inline-block align-middle ml-2" />
                      )}
                  </div>
                  
                  {/* Row 2: BASED (L1) */}
                  <div className="flex items-center gap-2 text-[10px] leading-tight mt-0.5">
                      <span className="text-muted-foreground font-mono font-bold">$BASED (L1):</span>
                      <span className="font-bold text-cyan-400 font-mono">
                        {priceData ? `$${priceData.basedL1Price.toFixed(7)}` : <div className="h-3 w-16 rounded skeleton inline-block align-middle" />}
                      </span>
                  </div>
               </div>
            </div>

            {/* PWA Install Button - Desktop */}
            {deferredPrompt && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleInstallClick}
                    className="ml-2 text-[10px] border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse font-orbitron tracking-widest"
                >
                    INSTALL BASED COMMAND APP
                </Button>
            )}

            {isAdmin && (
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={togglePause}
                    className={`ml-4 border-red-500/50 text-red-500 hover:bg-red-900/20 ${isPaused ? 'bg-red-900/30' : ''}`}
                >
                    {isPaused ? <PlayCircle className="w-4 h-4 mr-1" /> : <PauseCircle className="w-4 h-4 mr-1" />}
                    {isPaused ? "RESUME" : "PAUSE"}
                </Button>
            )}

            <div className="ml-4 flex items-center gap-3">
              {/* Badges */}
              {badges.topVoter && (
                  <Tooltip>
                      <TooltipTrigger>
                        <div className="p-1.5 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-400">
                            <Award size={16} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-black border-purple-500 text-purple-400 font-orbitron">
                          TOP VOTER (10+ VOTES)
                      </TooltipContent>
                  </Tooltip>
              )}
              {badges.eliteSeller && (
                  <Tooltip>
                      <TooltipTrigger>
                        <div className="p-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400">
                            <Star size={16} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-black border-yellow-500 text-yellow-400 font-orbitron">
                          ELITE SELLER (5+ SALES)
                      </TooltipContent>
                  </Tooltip>
              )}

              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      id="connect-wallet-btn"
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <Button 
                              onClick={openConnectModal} 
                              className="bg-primary text-primary-foreground hover:bg-primary/90 font-orbitron tracking-wider cyber-button shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_25px_rgba(0,255,255,0.7)] transition-all duration-300"
                            >
                              CONNECT
                            </Button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <Button onClick={openChainModal} variant="destructive">
                              Wrong network
                            </Button>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <Button 
                              onClick={openAccountModal} 
                              variant="outline"
                              className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary font-orbitron tracking-wider cyber-button"
                            >
                              {account.displayName}
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* PWA Install Button - Mobile (Header) */}
            {deferredPrompt && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleInstallClick}
                    className="h-8 text-[10px] px-2 border-cyan-500/50 text-cyan-400 bg-black/50 hover:bg-cyan-500/10 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse font-orbitron tracking-widest whitespace-nowrap"
                >
                    INSTALL APP
                </Button>
            )}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground hover:text-primary transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 border-b border-white/10 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 pt-2 pb-8 space-y-4 flex flex-col items-center">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-3 font-orbitron tracking-widest text-center ${
                    activeTab === item.id ? 'text-primary bg-primary/10' : 'text-foreground/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              
              <div className="w-full flex justify-center pt-4 border-t border-white/10 mt-4">
                <ConnectButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
