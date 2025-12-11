import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

export function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("bguard_tour_seen_v1");
    if (!hasSeenTour) {
      // Delay start slightly
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem("bguard_tour_seen_v1", "true");
    setIsVisible(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00ffff', '#bf00ff']
    });
  };

  const steps = [
    {
      title: "WELCOME TO BASED GUARDIANS",
      desc: "Connect your wallet to begin your journey in the Based Universe. Your gateway to the first fully on-chain cyberpunk world.",
      target: "top-right", 
    },
    {
      title: "MINT & GALLERY",
      desc: "Mint your unique Guardian from the Genesis collection and view your battalion in the Gallery tab with advanced filters.",
      target: "center",
    },
    {
      title: "DAO & ECONOMY",
      desc: "Participate in governance (DAO), trade on the Marketplace, and track the Community Pool. You are in control.",
      target: "top-center",
    }
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center">
        {/* Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsVisible(false)}
        />

        {/* Highlight Spotlights (Mocking positions) */}
        {step === 0 && (
            <motion.div 
                layoutId="spotlight"
                className="absolute top-4 right-4 w-48 h-16 border-2 border-primary shadow-[0_0_50px_rgba(0,255,255,0.5)] rounded-lg bg-transparent z-[101]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            />
        )}
        {step === 2 && (
            <motion.div 
                layoutId="spotlight"
                className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-16 border-2 border-primary shadow-[0_0_50px_rgba(0,255,255,0.5)] rounded-lg bg-transparent z-[101]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            />
        )}

        {/* Tour Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-primary/30 p-6 rounded-xl shadow-2xl max-w-sm w-full relative z-[102] pointer-events-auto"
        >
          <button 
            onClick={() => setIsVisible(false)} 
            className="absolute top-2 right-2 text-muted-foreground hover:text-white"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary text-xs font-mono px-2 py-0.5 rounded border border-primary/30">
                STEP {step + 1}/{steps.length}
            </span>
          </div>

          <h3 className="text-xl font-black font-orbitron text-white mb-2">{steps[step].title}</h3>
          <p className="text-sm text-muted-foreground mb-6 font-rajdhani">{steps[step].desc}</p>

          <div className="flex justify-between items-center">
            <div className="flex gap-1">
                {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'}`} />
                ))}
            </div>
            
            <Button 
                onClick={() => {
                    if (step < steps.length - 1) setStep(step + 1);
                    else handleComplete();
                }}
                className="bg-primary text-black hover:bg-primary/90 font-bold font-orbitron text-xs h-8"
            >
                {step < steps.length - 1 ? (
                    <>NEXT <ChevronRight size={14} className="ml-1" /></>
                ) : (
                    <>FINISH <CheckCircle2 size={14} className="ml-1" /></>
                )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
