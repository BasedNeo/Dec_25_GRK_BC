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
  activeTab: string;
  onTabChange: (tab: string) => void;
  isConnected: boolean; 
}

export function Navbar({ activeTab, onTabChange, isConnected }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { address, isConnected: wagmiConnected } = useAccount();
  const { isPaused, togglePause } = useSecurity();
  const isAdmin = address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const navItems = [
    { id: 'mint', label: 'MINT' },
    { id: 'gallery', label: 'GALLERY' },
    { id: 'voting', label: 'DAO' },
    { id: 'escrow', label: 'SALES' },
    { id: 'pool', label: 'POOL' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div 
            className="flex-shrink-0 cursor-pointer group flex items-center gap-4"
            onClick={() => onTabChange('mint')}
          >
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
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <button
                key={item.id}
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

            <div className="ml-4">
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
