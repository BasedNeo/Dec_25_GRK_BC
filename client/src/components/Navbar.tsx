import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@assets/generated_images/neon_cyan_glitch_text_logo_on_black.png";

interface NavbarProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Navbar({ isConnected, onConnect, onDisconnect }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer group">
            <div className="relative">
              <img 
                src={logo} 
                alt="Based Guardians" 
                className="h-10 w-auto object-contain glitch-hover"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#hero" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">MINT</a>
            <a href="#gallery" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">GALLERY</a>
            <a href="#voting" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">DAO</a>
            <a href="#pool" className="text-foreground/80 hover:text-primary transition-colors font-orbitron text-sm tracking-widest">POOL</a>
            
            {isConnected ? (
              <Button 
                variant="outline" 
                onClick={onDisconnect}
                className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary font-orbitron tracking-wider cyber-button"
              >
                <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                0x71...3A92
                <LogOut className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={onConnect}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-orbitron tracking-wider cyber-button shadow-[0_0_15px_rgba(0,255,255,0.5)] hover:shadow-[0_0_25px_rgba(0,255,255,0.7)] transition-all duration-300"
              >
                <Wallet className="mr-2 h-4 w-4" />
                CONNECT WALLET
              </Button>
            )}
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
              <a onClick={() => setIsMobileMenuOpen(false)} href="#voting" className="text-foreground/80 hover:text-primary py-2 font-orbitron tracking-widest">DAO</a>
              <a onClick={() => setIsMobileMenuOpen(false)} href="#pool" className="text-foreground/80 hover:text-primary py-2 font-orbitron tracking-widest">POOL</a>
              
              {isConnected ? (
                <Button 
                  variant="outline" 
                  onClick={() => { onDisconnect(); setIsMobileMenuOpen(false); }}
                  className="w-full border-primary/50 text-primary"
                >
                  0x71...3A92
                </Button>
              ) : (
                <Button 
                  onClick={() => { onConnect(); setIsMobileMenuOpen(false); }}
                  className="w-full bg-primary text-primary-foreground"
                >
                  CONNECT WALLET
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
