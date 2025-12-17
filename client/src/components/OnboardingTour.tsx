import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  X, ChevronRight, ChevronLeft, CheckCircle2, Rocket, 
  Wallet, ShoppingBag, Vote, Coins, Image, Sparkles, Map
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Rocket;
  targetSelector?: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: "Welcome to Based Guardians",
    description: "Your journey into the Giga Brain Galaxy begins here. Let us show you around the command center!",
    icon: Rocket,
    position: 'center',
  },
  {
    id: 'wallet',
    title: "Connect Your Wallet",
    description: "Click the wallet button to connect your MetaMask or other Web3 wallet to the BasedAI network (Chain ID: 32323).",
    icon: Wallet,
    targetSelector: '[data-testid="button-connect-wallet"]',
    position: 'bottom',
  },
  {
    id: 'hub',
    title: "Command Hub",
    description: "This is your home base. View your Guardian status, recent activity, and quick actions all in one place.",
    icon: Map,
    position: 'center',
    action: 'Navigate to Hub tab',
  },
  {
    id: 'mint',
    title: "Mint Your Guardian",
    description: "Mint unique NFTs from the Genesis collection. Each Guardian costs 69,420 $BASED and grants you voting rights in the DAO.",
    icon: Sparkles,
    position: 'center',
    action: 'Navigate to Mint section',
  },
  {
    id: 'gallery',
    title: "Browse the Gallery",
    description: "Explore all 3,732 unique Guardians, Frogs, and Creatures. Use filters to find rare traits and hidden gems.",
    icon: Image,
    position: 'center',
    action: 'Navigate to Gallery',
  },
  {
    id: 'marketplace',
    title: "Trade on the Marketplace",
    description: "Buy and sell Guardians with other collectors. Make offers, list your NFTs, and track pending sales.",
    icon: ShoppingBag,
    position: 'center',
    action: 'Navigate to Marketplace',
  },
  {
    id: 'voting',
    title: "DAO Governance",
    description: "As a Guardian holder, you can vote on community proposals. Your voice shapes the future of the collection!",
    icon: Vote,
    position: 'center',
    action: 'Navigate to Voting',
  },
  {
    id: 'pool',
    title: "Community Treasury",
    description: "Track the community pool, emissions from the Brain subnet, and see how value flows back to holders.",
    icon: Coins,
    position: 'center',
    action: 'Navigate to Pool Tracker',
  },
  {
    id: 'complete',
    title: "You're Ready!",
    description: "That's everything you need to know. Start exploring and become a legendary Guardian in the Based Universe!",
    icon: CheckCircle2,
    position: 'center',
  },
];

const STORAGE_KEY = 'bguard_tour_completed_v2';

export function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const hasCompletedTour = localStorage.getItem(STORAGE_KEY);
    const isFirstVisit = !localStorage.getItem('disclaimer_accepted');
    
    if (!hasCompletedTour && !isFirstVisit) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateHighlight = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isVisible) {
      updateHighlight();
      window.addEventListener('resize', updateHighlight);
      return () => window.removeEventListener('resize', updateHighlight);
    }
  }, [isVisible, currentStep, updateHighlight]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] pointer-events-auto"
        data-testid="onboarding-tour"
      >
        {highlightRect ? (
          <>
            <div 
              className="absolute bg-black/70 transition-all duration-300"
              style={{ top: 0, left: 0, right: 0, height: highlightRect.top }}
            />
            <div 
              className="absolute bg-black/70 transition-all duration-300"
              style={{ top: highlightRect.bottom, left: 0, right: 0, bottom: 0 }}
            />
            <div 
              className="absolute bg-black/70 transition-all duration-300"
              style={{ top: highlightRect.top, left: 0, width: highlightRect.left, height: highlightRect.height }}
            />
            <div 
              className="absolute bg-black/70 transition-all duration-300"
              style={{ top: highlightRect.top, right: 0, left: highlightRect.right, height: highlightRect.height }}
            />
            <div 
              className="absolute border-2 border-cyan-400 rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.6)] transition-all duration-300 pointer-events-none"
              style={{
                top: highlightRect.top - 4,
                left: highlightRect.left - 4,
                width: highlightRect.width + 8,
                height: highlightRect.height + 8,
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        )}

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`absolute bg-gradient-to-br from-gray-900 to-black border border-cyan-500/50 rounded-2xl shadow-[0_0_40px_rgba(0,255,255,0.3)] max-w-md w-[90%] p-6 ${
            highlightRect 
              ? highlightRect.top > window.innerHeight / 2
                ? 'top-1/4 left-1/2 -translate-x-1/2'
                : 'bottom-1/4 left-1/2 -translate-x-1/2'
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}
        >
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors p-1"
            data-testid="button-skip-tour"
          >
            <X size={18} />
          </button>

          <div className="w-full bg-gray-800 rounded-full h-1 mb-6">
            <motion.div 
              className="bg-gradient-to-r from-cyan-400 to-purple-500 h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30 flex-shrink-0">
              <Icon className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <h3 className="text-xl font-orbitron font-bold text-white mt-1">
                {step.title}
              </h3>
            </div>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed mb-6 pl-[68px]">
            {step.description}
          </p>

          {step.action && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 mb-6 ml-[68px]">
              <p className="text-purple-300 text-xs font-mono flex items-center gap-2">
                <Sparkles size={12} /> Tip: {step.action}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="text-gray-400 hover:text-white disabled:opacity-30"
              data-testid="button-tour-prev"
            >
              <ChevronLeft size={16} className="mr-1" /> Back
            </Button>

            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentStep 
                      ? 'bg-cyan-400 w-4' 
                      : i < currentStep 
                        ? 'bg-cyan-400/50' 
                        : 'bg-gray-600'
                  }`}
                  data-testid={`button-tour-dot-${i}`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold hover:from-cyan-400 hover:to-cyan-300 shadow-[0_0_20px_rgba(0,255,255,0.4)]"
              data-testid="button-tour-next"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>Get Started <CheckCircle2 size={14} className="ml-1" /></>
              ) : (
                <>Next <ChevronRight size={14} className="ml-1" /></>
              )}
            </Button>
          </div>

          <p className="text-center text-gray-600 text-xs mt-4">
            Press ESC or click X to skip the tour
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useTour() {
  const [isOpen, setIsOpen] = useState(false);

  const startTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsOpen(true);
    window.location.reload();
  }, []);

  return { startTour, isOpen };
}
