import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { NFTGallery } from "@/components/NFTGallery";
import { ValueEstimation } from "@/components/ValueEstimation";
import { VotingDAO } from "@/components/VotingDAO";
import { PoolTracker } from "@/components/PoolTracker";
import { EscrowMarketplace } from "@/components/EscrowMarketplace";
import { Footer } from "@/components/Footer";
import { useAccount } from "wagmi";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { OnboardingTour } from "@/components/OnboardingTour";

export default function Home() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("mint");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <OnboardingTour />
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} isConnected={isConnected} />
      
      <main className="pt-20 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
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
              <NFTGallery isConnected={isConnected} onConnect={() => {}} />
            </motion.div>
          )}

          {activeTab === "escrow" && (
            <motion.div
              key="escrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <EscrowMarketplace />
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
              <VotingDAO isConnected={isConnected} onConnect={() => {}} />
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
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
