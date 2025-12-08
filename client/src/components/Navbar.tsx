import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ShieldAlert, PlayCircle, PauseCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@assets/generated_images/neon_cyan_glitch_text_logo_on_black.png";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useSecurity } from "@/context/SecurityContext";
import { ADMIN_WALLET } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

interface NavbarProps {
  isConnected: boolean; // Kept for legacy prop compatibility if needed, but RainbowKit handles state
}

export function Navbar({ isConnected }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { address, isConnected: wagmiConnected } = useAccount();
  const { isPaused, togglePause } = useSecurity();
  const isAdmin = address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  // Track Wallet Connection
  useEffect(() => {
    if (wagmiConnected && address) {
        trackEvent('wallet_connect', 'User', 'Navbar');
    }
  }, [wagmiConnected, address]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer group flex items-center gap-4">
            <div className="relative">
              <img 
                src={logo} 
                alt="Based Guardians" 
                className="h-10 w-auto object-contain glitch-hover"
              />
            </div>
            {isPaused && (
                <Badge variant="destructive" className="animate-pulse border-red-500 bg-red-900/50 text-red-500">
                    <ShieldAlert className="w-3 h-3 mr-1" /> SYSTEM PAUSED
                </Badge>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#hero" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">MINT</a>
            <a href="#gallery" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">GALLERY</a>
            <a href="#escrow" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">MARKET</a>
            <a href="#voting" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">DAO</a>
            <a href="#pool" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">POOL</a>
            
            {isAdmin && (
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={togglePause}
                    className={`border-red-500/50 text-red-500 hover:bg-red-900/20 ${isPaused ? 'bg-red-900/30' : ''}`}
                >
                    {isPaused ? <PlayCircle className="w-4 h-4 mr-1" /> : <PauseCircle className="w-4 h-4 mr-1" />}
                    {isPaused ? "RESUME SYSTEM" : "EMERGENCY PAUSE"}
                </Button>
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
                            CONNECT WALLET
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
                            onClick={openChainModal}
                            variant="outline"
                            className="border-primary/50 text-primary hidden lg:flex"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  marginRight: 4,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 12, height: 12 }}
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </Button>

                          <Button 
                            onClick={openAccountModal} 
                            variant="outline"
                            className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary font-orbitron tracking-wider cyber-button"
                          >
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ''}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
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
              <a onClick={() => setIsMobileMenuOpen(false)} href="#hero" className="text-foreground/80 hover:text-primary py-2 font-orbitron tracking-widest">MINT</a>
              <a onClick={() => setIsMobileMenuOpen(false)} href="#gallery" className="text-foreground/80 hover:text-primary py-2 font-orbitron tracking-widest">GALLERY</a>
              <a onClick={() => setIsMobileMenuOpen(false)} href="#escrow" className="text-foreground/80 hover:text-primary py-2 font-orbitron tracking-widest">MARKET</a>
              <a onClick={() => setIsMobileMenuOpen(false)} href="#voting" className="text-foreground/80 hover:text-primary py-2 font-orbitron tracking-widest">DAO</a>
              <a onClick={() => setIsMobileMenuOpen(false)} href="#pool" className="text-foreground/80 hover:text-primary py-2 font-orbitron tracking-widest">POOL</a>
              
              <div className="w-full flex justify-center pt-4">
                <ConnectButton />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
