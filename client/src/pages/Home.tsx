import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { NFTGallery } from "@/components/NFTGallery";
import { ValueEstimation } from "@/components/ValueEstimation";
import { PoolTracker } from "@/components/PoolTracker";
import { UniverseTab } from "@/components/UniverseTab";
import { Footer } from "@/components/Footer";
import { HomeHub } from "@/components/HomeHub";
import { useAccount } from "wagmi";
import { useState, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { OnboardingTour } from "@/components/OnboardingTour";
import { AdminInbox } from "@/components/AdminInbox";
import { UserStats } from "@/components/UserStats";
import { SagaGuide } from "@/components/SagaGuide";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { analytics } from '@/lib/analytics';

const AdminDashboard = lazy(() => import("@/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const EscrowMarketplace = lazy(() => import("@/components/EscrowMarketplace").then(m => ({ default: m.EscrowMarketplace })));
const Governance = lazy(() => import("@/components/Governance").then(m => ({ default: m.Governance })));
const ActivityFeed = lazy(() => import("@/components/ActivityFeed").then(m => ({ default: m.ActivityFeed })));

export default function Home() {
  const { isConnected } = useAccount();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // Initialize tab from URL hash (e.g., /#mint -> "mint")
  const getTabFromHash = () => {
    const hash = window.location.hash.slice(1); // Remove the #
    const validTabs = ['hub', 'mint', 'gallery', 'escrow', 'universe', 'pool', 'stats', 'saga-guide', 'voting', 'activity'];
    return validTabs.includes(hash) ? hash : 'hub';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromHash);

  // Sync URL hash with tab state
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL hash without triggering navigation
    window.history.replaceState(null, '', tab === 'hub' ? '/' : `/#${tab}`);
  };

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Scroll to top on tab change and track page visits
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Track page visits for User Stats
    const visited = JSON.parse(localStorage.getItem('pagesVisited') || '[]');
    if (!visited.includes(activeTab)) {
      visited.push(activeTab);
      localStorage.setItem('pagesVisited', JSON.stringify(visited));
    }
    
    // Track tab change for analytics
    analytics.pageView(activeTab);
  }, [activeTab]);

  // Listen for tab navigation events from child components
  useEffect(() => {
    const handleNavigateTab = (e: CustomEvent) => {
      if (e.detail) {
        handleTabChange(e.detail);
      }
    };
    window.addEventListener('navigate-tab', handleNavigateTab as EventListener);
    return () => window.removeEventListener('navigate-tab', handleNavigateTab as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
      <OnboardingTour />
      <Navbar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isConnected={isConnected}
      />
      
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
              <HomeHub onNavigate={handleTabChange} onOpenAdmin={() => setShowAdminPanel(true)} />
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
              <UniverseTab onMintClick={() => handleTabChange("mint")} />
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
              <ErrorBoundary feature="Portfolio" isolate={true}>
                <NFTGallery filterByOwner={true} title="YOUR BATTALION" />
              </ErrorBoundary>
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
              <ErrorBoundary feature="Marketplace" isolate={true}>
                <Suspense fallback={<LoadingSpinner text="Loading Market..." />}>
                  <EscrowMarketplace 
                    onNavigateToMint={() => setActiveTab("mint")} 
                    onNavigateToPortfolio={() => setActiveTab("gallery")}
                  />
                </Suspense>
              </ErrorBoundary>
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
              <ErrorBoundary feature="Governance" isolate={true}>
                <Suspense fallback={<LoadingSpinner text="Loading Governance..." />}>
                  <Governance />
                </Suspense>
              </ErrorBoundary>
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
              <ErrorBoundary feature="Treasury" isolate={true}>
                <PoolTracker />
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <ErrorBoundary feature="Stats" isolate={true}>
                <UserStats />
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === "saga-guide" && (
            <motion.div
              key="saga-guide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <ErrorBoundary feature="Saga Guide" isolate={true}>
                <SagaGuide />
              </ErrorBoundary>
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
              <Suspense fallback={<LoadingSpinner text="Loading Activity..." />}>
                <ActivityFeed limit={30} showStats={true} />
              </Suspense>
            </motion.div>
          )}

          {activeTab === "inbox" && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <AdminInbox onBack={() => setActiveTab("hub")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {activeTab !== "universe" && activeTab !== "hub" && <Footer />}
      
      <Suspense fallback={<LoadingSpinner text="Loading Admin..." />}>
        <AdminDashboard 
          isOpen={showAdminPanel} 
          onClose={() => setShowAdminPanel(false)}
          onOpenInbox={() => { setShowAdminPanel(false); setActiveTab('inbox'); }}
        />
      </Suspense>
    </div>
  );
}
