import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { NFTGallery } from "@/components/NFTGallery";
import { ValueEstimation } from "@/components/ValueEstimation";
import { Governance } from "@/components/Governance";
import { PoolTracker } from "@/components/PoolTracker";
import { UniverseTab } from "@/components/UniverseTab";
import { Footer } from "@/components/Footer";
import { HomeHub } from "@/components/HomeHub";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { OnboardingTour } from "@/components/OnboardingTour";
import { EscrowMarketplace } from "@/components/EscrowMarketplace";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function Home() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("hub");

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Listen for tab navigation events from child components
  useEffect(() => {
    const handleNavigateTab = (e: CustomEvent) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('navigate-tab', handleNavigateTab as EventListener);
    return () => window.removeEventListener('navigate-tab', handleNavigateTab as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <OnboardingTour />
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} isConnected={isConnected} />
      
      <main className="pt-20 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === "hub" && (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <HomeHub onNavigate={setActiveTab} />
            </motion.div>
          )}

          {activeTab === "universe" && (
            <motion.div
              key="universe"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <UniverseTab onMintClick={() => setActiveTab("mint")} />
            </motion.div>
          )}

          {activeTab === "mint" && (
            <motion.div
              key="mint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Hero />
              <ValueEstimation />
            </motion.div>
          )}

          {activeTab === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <NFTGallery filterByOwner={true} title="YOUR BATTALION" />
            </motion.div>
          )}

          {activeTab === "escrow" && (
            <motion.div
              key="escrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <EscrowMarketplace 
                onNavigateToMint={() => setActiveTab("mint")} 
                onNavigateToPortfolio={() => setActiveTab("gallery")}
              />
            </motion.div>
          )}

          {activeTab === "voting" && (
            <motion.div
              key="voting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <Governance />
            </motion.div>
          )}

          {activeTab === "pool" && (
            <motion.div
              key="pool"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <PoolTracker />
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <ActivityFeed limit={30} showStats={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {activeTab !== "universe" && activeTab !== "hub" && <Footer />}
    </div>
  );
}
