import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ShieldAlert, PlayCircle, PauseCircle, Award, Star, WifiOff, RefreshCcw, Link2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBlockNumber, useConnect, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "@/lib/constants";
import { useSecurity } from "@/context/SecurityContext";
import { ADMIN_WALLET } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import confetti from "canvas-confetti";
import { showToast } from "@/lib/customToast";
import { useQueryClient } from "@tanstack/react-query";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { WalletBalanceDisplay } from "./WalletBalanceDisplay";
import { NotificationSettings } from "./NotificationSettings";
import Untitled from "@/assets/Untitled.png";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isConnected: boolean; 
}

export function Navbar({ activeTab, onTabChange, isConnected }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  // const { toast } = useToast(); // Using custom toast
  const { address, isConnected: wagmiConnected, chain } = useAccount();
  const { error: connectError } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isWrongNetwork = wagmiConnected && chain?.id !== CHAIN_ID;
  const queryClient = useQueryClient();
  
  // RPC Connection Monitoring
  const { error: blockError, refetch: refetchBlock } = useBlockNumber({ 
    query: { 
        refetchInterval: 10000,
        retry: 2
    } 
  });

  useEffect(() => {
    if (blockError) {
        showToast("Network Unavailable: Unable to connect to BasedAI network.", "error");
    }
  }, [blockError]);

  // Wallet Connection Error Handling
  useEffect(() => {
    if (connectError) {
        let message = "Failed to connect wallet.";
        if (connectError.message.includes("User rejected")) {
            message = "Connection rejected by user.";
        } else if (connectError.message.includes("Connector not found")) {
            message = "Wallet not found. Please install a compatible wallet.";
        }

        showToast(message, "error");
    }
  }, [connectError]);

  const handleLogoClick = () => {
    setIsShaking(true);
    onTabChange('hub');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setIsShaking(false), 500);
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
        showToast("Install Not Available: Your browser might not support PWA installation or it's already installed.", "info");
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
    { id: 'gallery', label: 'PORTFOLIO' },
    { id: 'escrow', label: 'COLLECTION' },
    { id: 'universe', label: 'UNIVERSE' },
    { id: 'pool', label: 'POOL' },
    { id: 'voting', label: 'VOTING' }, 
    { id: 'mint', label: 'MINT' },
    { id: 'activity', label: 'ACTIVITY' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
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
          <div className="flex items-center gap-2 ml-auto md:ml-4 mr-2 md:mr-0 price-feed-container flex-shrink-0">
               {/* Price Feed - Visible on ALL screens */}
               <div 
                 id="priceBadge"
                 className="flex flex-col justify-center px-4 py-2 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl transition-all duration-300 min-w-[120px] md:min-w-[150px] hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]"
               >
                  {/* Row 1: BASED (ETH) */}
                  <div className="flex items-center justify-between gap-2 md:gap-3 text-[10px] leading-tight">
                      <div className="flex items-center gap-1">
                          <span className="text-muted-foreground font-mono font-bold">$BASED (ETH):</span>
                          <span className="font-bold text-white font-mono">
                            {priceData === undefined 
                              ? <div className="h-3 w-12 rounded skeleton inline-block align-middle" />
                              : priceData.usdPrice > 0 
                                ? `$${priceData.usdPrice.toFixed(4)}` 
                                : '—'
                            }
                          </span>
                      </div>
                      {priceData && priceData.usdPrice > 0 && priceData.change24h !== undefined && (
                        <span className={`font-bold font-mono ${priceData.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {priceData.change24h >= 0 ? '▲' : '▼'} {Math.abs(priceData.change24h || 0).toFixed(1)}%
                        </span>
                      )}
                  </div>
                  
                  {/* Row 2: BASED (L1) */}
                  <div className="flex items-center gap-2 text-[10px] leading-tight mt-0.5">
                      <span className="text-muted-foreground font-mono font-bold">$BASED (L1):</span>
                      <span className="font-bold text-cyan-400 font-mono">
                        {priceData === undefined 
                          ? <div className="h-3 w-16 rounded skeleton inline-block align-middle" />
                          : priceData.basedL1Price > 0 
                            ? `$${priceData.basedL1Price.toFixed(7)}` 
                            : '—'
                        }
                      </span>
                  </div>
               </div>
            </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={item.id === 'voting' ? 'nav-vote' : undefined}
                onClick={() => onTabChange(item.id)}
                className={`relative px-3 py-2.5 font-orbitron text-[11px] tracking-[0.15em] transition-all duration-300 rounded-lg group ${
                  activeTab === item.id 
                    ? 'text-cyan-400' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-400/10 to-transparent rounded-lg border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.15)] -z-10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className={`relative ${activeTab === item.id ? 'drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]'}`}>
                  {item.label}
                </span>
              </button>
            ))}
            
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
              {/* Chain Indicator */}
              {wagmiConnected && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border cursor-pointer transition-all ${
                        isWrongNetwork 
                          ? 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                      }`}
                      onClick={() => isWrongNetwork && switchChain({ chainId: CHAIN_ID })}
                      data-testid="chain-indicator"
                    >
                      {isWrongNetwork ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold">
                            {isSwitching ? 'SWITCHING...' : chain?.name?.slice(0, 8) || 'WRONG'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono font-bold">BASEDAI</span>
                        </>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className={`font-orbitron ${isWrongNetwork ? 'bg-red-900 border-red-500 text-red-300' : 'bg-black border-cyan-500 text-cyan-400'}`}>
                    {isWrongNetwork ? 'Click to switch to BasedAI (32323)' : 'Connected to BasedAI Mainnet'}
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Wallet Balance Display */}
              <WalletBalanceDisplay />
              
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
              
              <NotificationSettings />

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
                              className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-orbitron text-xs tracking-[0.15em] px-6 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:shadow-[0_0_30px_rgba(0,255,255,0.6)] hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 border-0"
                            >
                              CONNECT
                            </Button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <Button onClick={openChainModal} className="bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 font-orbitron text-xs tracking-wider rounded-xl">
                              Wrong network
                            </Button>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <Button 
                              onClick={openAccountModal} 
                              className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-400 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] font-orbitron text-xs tracking-[0.1em] px-5 py-2.5 rounded-xl transition-all duration-300"
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
            {/* Wallet Balance - Mobile */}
            <WalletBalanceDisplay />
            
            {/* PWA Install Button - Mobile (Header) */}
            {deferredPrompt && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleInstallClick}
                    className="h-8 text-[10px] px-2 border-cyan-500/50 text-cyan-400 bg-black/50 hover:bg-cyan-500/10 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse font-orbitron tracking-widest whitespace-nowrap"
                >
                    Install Based Command App
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
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="md:hidden bg-gradient-to-b from-black/98 to-black/95 border-b border-cyan-500/10 backdrop-blur-2xl"
          >
            <div className="px-6 pt-4 pb-10 space-y-2 flex flex-col items-center">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-4 font-orbitron text-sm tracking-[0.2em] text-center rounded-xl transition-all duration-200 ${
                    activeTab === item.id 
                      ? 'text-cyan-400 bg-gradient-to-r from-cyan-500/15 via-cyan-400/10 to-transparent border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.1)]' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              
              <div className="w-full flex justify-center gap-4 pt-6 border-t border-white/5 mt-4">
                <NotificationSettings />
                <ConnectButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
