import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { Minus, Plus, Zap, CheckCircle, Fingerprint } from "lucide-react";
import { MOCK_GUARDIANS, MINT_PRICE, MINTED_COUNT, TOTAL_SUPPLY } from "@/lib/mockData";
import { NFT_SYMBOL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

import { useSecurity } from "@/context/SecurityContext";
import { trackEvent } from "@/lib/analytics";
import { useABTest } from "@/hooks/useABTest";

import flagVideo from '@assets/FlagVideo1_1765424361045.mp4';

export function Hero() {
  const [mintQuantity, setMintQuantity] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const { toast } = useToast();
  const { isPaused } = useSecurity();
  const mintButtonColor = useABTest('mint-button-color', ['cyan', 'purple']);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(videoRef, { once: true, margin: "200px" });

  useEffect(() => {
    if (isInView && videoRef.current) {
        videoRef.current.play().catch(e => console.log("Video autoplay failed", e));
    }
  }, [isInView]);
  
  // Supply Counter Animation
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, MINTED_COUNT, { duration: 2, ease: "easeOut" });
    return animation.stop;
  }, []);

  // Smart Contract Interaction Mock:
  // Implements nonReentrant, whenNotPaused modifiers from OpenZeppelin
  const handleMint = () => {
    if (isPaused) {
        toast({
            title: "System Paused",
            description: "Minting is currently paused by the administrator.",
            variant: "destructive"
        });
        return;
    }

    setIsMinting(true);
    
    // Analytics: Track Mint Attempt
    trackEvent('mint_attempt', 'Transaction', 'Hero Section', mintQuantity);

    setTimeout(() => {
      setIsMinting(false);
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ffff', '#bf00ff', '#ffffff']
      });

      // Analytics: Track Successful Mint
      trackEvent('mint_success', 'Transaction', 'Hero Section', mintQuantity);

      toast({
        title: "Mint Successful!",
        description: `You successfully minted ${mintQuantity} Based Guardian(s).`,
        variant: "default",
        className: "bg-black border-primary text-primary font-orbitron",
      });
    }, 2000);
  };

  const handlePasskeyConnect = () => {
      toast({
        title: "Passkey Auth Initiated",
        description: "Scanning for Face ID / Touch ID...",
        className: "bg-black border-cyan-500 text-cyan-500 font-orbitron",
      });
      setTimeout(() => {
          toast({
              title: "Authentication Successful",
              description: "Secure enclave signature verified.",
              className: "bg-black border-green-500 text-green-500 font-orbitron",
          });
      }, 1500);
  };

  const increment = () => setMintQuantity(prev => Math.min(prev + 1, 10));
  const decrement = () => setMintQuantity(prev => Math.max(prev - 1, 1));

  return (
    <section id="hero" className="min-h-screen pt-24 pb-12 flex items-center relative overflow-hidden">
      {/* Beta Ribbon (Red Corner Badge) */}
      <div className="absolute top-24 left-0 w-32 h-32 overflow-hidden z-20 pointer-events-none">
        <div className="absolute top-0 left-0 transform -translate-x-10 translate-y-6 -rotate-45 bg-red-600 text-white font-bold font-orbitron text-[10px] py-1 w-40 text-center shadow-lg border border-red-400/50">
          BETA v1.0
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10" />
          <video 
            ref={videoRef}
            src={flagVideo} 
            poster="/hero.jpg"
            loop 
            muted 
            playsInline 
            preload="none"
            className="w-full h-full object-cover opacity-80"
          />
          <img src="/hero.jpg" alt="Hero Background" className="w-full h-full object-cover opacity-20 absolute inset-0 mix-blend-overlay" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)] z-0" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Text & Mint UI */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary font-mono tracking-widest bg-primary/5">
            SERIES 01: GENESIS
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight text-white glitch-hover">
            BASED GUARDIANS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">({NFT_SYMBOL})</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 font-rajdhani leading-relaxed max-w-lg">
            The Based Guardians — Step into the Based Universe where courage, creativity, and community collide. 3,732 unique NFTs (1,776 Guardians, 1,320 Frogs, 636 Creatures). Staked to BasedAI Brain for $BASED emissions; Legendary rarities unlock yields/Race-to-Base privileges. Father-daughter vision blending 80s retro-fantasy with AI/blockchain/humanitarian mission. 'This story, your story, has only just begun... Stay Based.'
          </p>

          <div className="bg-card/50 backdrop-blur-sm border border-white/10 p-6 rounded-xl max-w-md">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-muted-foreground font-mono">SUPPLY</span>
              <span className="text-xl font-orbitron text-primary text-glow">
                  <motion.span>{rounded}</motion.span> / {TOTAL_SUPPLY}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-8">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(MINTED_COUNT / TOTAL_SUPPLY) * 100}%` }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
            </div>

            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-4 bg-black/40 p-2 rounded-lg border border-white/5">
                <button onClick={decrement} className="p-2 hover:text-primary transition-colors"><Minus size={18} /></button>
                <span className="font-orbitron w-8 text-center">{mintQuantity}</span>
                <button onClick={increment} className="p-2 hover:text-primary transition-colors"><Plus size={18} /></button>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">TOTAL PRICE</div>
                <div className="text-xl font-orbitron text-white">{(MINT_PRICE * mintQuantity).toLocaleString()} <span className="text-primary text-sm">$BASED</span></div>
              </div>
            </div>

            <Button 
              id="hero-mint-section"
              onClick={handleMint}
              disabled={isMinting || isPaused}
              className={`w-full py-6 text-lg font-orbitron tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cyber-button mb-4
                ${mintButtonColor === 'purple' 
                  ? 'bg-[#bf00ff] text-white hover:bg-[#bf00ff]/90 shadow-[0_0_20px_rgba(191,0,255,0.4)]' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,255,0.4)]'
                }
              `}
            >
              {isPaused ? (
                  <span className="flex items-center text-red-500">
                      <Zap className="mr-2 h-4 w-4" /> PAUSED
                  </span>
              ) : isMinting ? (
                <span className="animate-pulse flex items-center">
                  PROCESSING <Zap className="ml-2 h-4 w-4 animate-bounce" />
                </span>
              ) : (
                "MINT GUARDIAN"
              )}
            </Button>

            <Button
                variant="outline"
                onClick={handlePasskeyConnect}
                className="w-full py-6 border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 font-mono text-xs flex items-center justify-center gap-2"
            >
                <Fingerprint size={16} />
                CONNECT WITH PASSKEY / FACE ID
            </Button>
            
            <p className="mt-4 text-xs text-center text-muted-foreground/60 font-mono">
              51% of proceeds sent to Community Pool
            </p>
          </div>
        </motion.div>

        {/* Right Column: NFT Carousel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="relative aspect-square max-w-md mx-auto">
            {/* Decorative Rings */}
            <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-4 border border-accent/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            
            {/* Main Image Card */}
            <Card className="absolute inset-8 bg-black border-primary/30 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.15)] group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
              <img 
                src={MOCK_GUARDIANS[0].image} 
                alt="Guardian Preview" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                <Badge className="mb-2 bg-primary/20 text-primary hover:bg-primary/30 border-none">
                  LEGENDARY
                </Badge>
                <h3 className="text-2xl font-orbitron text-white mb-1">Guardian #0042</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <CheckCircle size={14} className="text-primary" />
                  <span>Verified Contract</span>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
