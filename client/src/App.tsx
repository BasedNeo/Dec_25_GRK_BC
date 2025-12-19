import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import '@/lib/i18n';
import { lazy, Suspense, useState } from "react";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import { MatrixWelcomeOverlay } from "@/components/MatrixWelcomeOverlay";
import { useWelcomeExperience } from "@/hooks/useWelcomeExperience";

// Lazy load secondary pages for faster initial load
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Odyssey = lazy(() => import("@/pages/Odyssey"));
const Creators = lazy(() => import("@/pages/Creators"));
const Saga = lazy(() => import("@/pages/Saga"));
const GuardianDefender = lazy(() => import("@/pages/GuardianDefender"));
const GuardianDefense = lazy(() => import("@/pages/GuardianDefense"));
const GuardianSolitaire = lazy(() => import("@/pages/GuardianSolitaire"));
const AsteroidMining = lazy(() => import("@/pages/AsteroidMining"));
const BasedArcade = lazy(() => import("@/pages/BasedArcade"));
const TransactionHistory = lazy(() => import("@/pages/TransactionHistory"));
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "./lib/wagmi";
import { SecurityProvider } from "@/context/SecurityContext";
import { TransactionProvider } from "@/context/TransactionContext";
import { initAnalytics } from "@/lib/analytics";
import { useEffect } from "react";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { SpaceBackground } from "@/components/SpaceBackground";
import { OnboardingTour } from "@/components/OnboardingTour";
import { GlobalBuyListener } from "@/components/GlobalBuyListener";
import { WalletWatcher } from "@/components/WalletWatcher";
import { NetworkSwitchBanner } from "@/components/NetworkSwitchBanner";
import { DegradationBanner } from "@/components/DegradationBanner";
import { PendingTxBanner } from "@/components/PendingTxBanner";
import { PendingPurchaseBanner } from "@/components/PendingPurchaseBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DiagnosticPanel } from "@/components/DiagnosticPanel";
import { HealthCheckBanner } from "@/components/HealthCheckBanner";
import { GuardianProfileProvider } from "@/components/GuardianProfileProvider";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { useNotificationWatchers } from "@/hooks/useNotificationWatchers";
import { Rocket } from "lucide-react";

function GlobalErrorFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,0,255,0.06)_0%,transparent_40%)]" />
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.2,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`
            }}
          />
        ))}
      </div>
      
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      
      <div className="text-center p-8 relative z-10 max-w-lg">
        <div className="mb-8">
          <div className="mb-4">
            <Rocket className="w-20 h-20 text-cyan-400 mx-auto rotate-180 motion-safe:animate-float" />
          </div>
          <div className="font-orbitron text-[10px] tracking-[0.4em] text-cyan-400/50 uppercase">
            // transmission interrupted
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-orbitron font-bold mb-6 text-white leading-tight">
          A Small Glitch in the{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            Galaxy
          </span>
        </h1>
        
        <p className="text-gray-300 mb-2 text-base">
          Even the best starships hit turbulence sometimes.
        </p>
        <p className="text-gray-500 mb-8 text-sm">
          Your assets are safe. Let's get you back on course.
        </p>
        
        <button 
          onClick={() => window.location.reload()}
          className="group px-8 py-4 bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500 text-black rounded-xl font-orbitron font-bold text-base hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] transition-all duration-300 flex items-center justify-center gap-3 mx-auto transform hover:scale-105"
          data-testid="button-refresh-page"
        >
          <Rocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          RELAUNCH
        </button>
        
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-4 px-6 py-2 text-cyan-400/70 hover:text-cyan-400 font-mono text-xs transition-colors"
        >
          or return to Command Center →
        </button>
        
        <p className="text-gray-600/50 text-[10px] mt-8 font-mono">
          Based Guardians • Protecting the Galaxy
        </p>
      </div>
    </div>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="text-white text-xl font-orbitron font-semibold mb-2">Loading...</p>
        <p className="text-cyan-300/70 text-sm">Preparing the Guardian experience</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path="/">
          <ErrorBoundary feature="Home">
            <Home />
          </ErrorBoundary>
        </Route>
        <Route path="/terms">
          <ErrorBoundary feature="Terms">
            <TermsOfService />
          </ErrorBoundary>
        </Route>
        <Route path="/privacy">
          <ErrorBoundary feature="Privacy">
            <PrivacyPolicy />
          </ErrorBoundary>
        </Route>
        <Route path="/odyssey">
          <ErrorBoundary feature="Odyssey">
            <Odyssey />
          </ErrorBoundary>
        </Route>
        <Route path="/creators">
          <ErrorBoundary feature="Creators">
            <Creators />
          </ErrorBoundary>
        </Route>
        <Route path="/saga">
          <ErrorBoundary feature="Saga">
            <Saga />
          </ErrorBoundary>
        </Route>
        <Route path="/game">
          <ErrorBoundary feature="Guardian Defender">
            <GuardianDefender />
          </ErrorBoundary>
        </Route>
        <Route path="/games">
          <ErrorBoundary feature="Based Arcade">
            <BasedArcade />
          </ErrorBoundary>
        </Route>
        <Route path="/games/guardian-defense">
          <ErrorBoundary feature="Guardian Defense">
            <GuardianDefense />
          </ErrorBoundary>
        </Route>
        <Route path="/games/guardian-solitaire">
          <ErrorBoundary feature="Guardian Solitaire">
            <GuardianSolitaire />
          </ErrorBoundary>
        </Route>
        <Route path="/games/asteroid-mining">
          <ErrorBoundary feature="Asteroid Mining">
            <AsteroidMining />
          </ErrorBoundary>
        </Route>
        <Route path="/arcade">
          <ErrorBoundary feature="Based Arcade">
            <BasedArcade />
          </ErrorBoundary>
        </Route>
        <Route path="/guardian-defense">
          <ErrorBoundary feature="Guardian Defense">
            <GuardianDefense />
          </ErrorBoundary>
        </Route>
        <Route path="/guardian-solitaire">
          <ErrorBoundary feature="Guardian Solitaire">
            <GuardianSolitaire />
          </ErrorBoundary>
        </Route>
        <Route path="/asteroid-mining">
          <ErrorBoundary feature="Asteroid Mining">
            <AsteroidMining />
          </ErrorBoundary>
        </Route>
        <Route path="/transactions">
          <ErrorBoundary feature="Transaction History">
            <TransactionHistory />
          </ErrorBoundary>
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

function NotificationWatcherSetup() {
  useNotificationWatchers();
  return null;
}

function WelcomeExperienceWrapper({ children }: { children: React.ReactNode }) {
  const { shouldShow, isFirstVisit, loading, markShown, prefersReducedMotion } = useWelcomeExperience();
  const [showOverlay, setShowOverlay] = useState(true);

  const handleComplete = () => {
    markShown();
    setShowOverlay(false);
  };

  if (loading) {
    return <>{children}</>;
  }

  return (
    <>
      {shouldShow && showOverlay && (
        <MatrixWelcomeOverlay
          isFirstVisit={isFirstVisit}
          onComplete={handleComplete}
          prefersReducedMotion={prefersReducedMotion}
        />
      )}
      {children}
    </>
  );
}

function App() {
  const [appReady, setAppReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  useEffect(() => {
    initAnalytics();
  }, []);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!appReady) {
        setLoadError('App initialization timeout. Please refresh.');
      }
    }, 10000);
    
    const initTimer = setTimeout(() => {
      setAppReady(true);
    }, 100);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(initTimer);
    };
  }, [appReady]);
  
  if (!appReady && !loadError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <Rocket className="w-16 h-16 text-cyan-400 mx-auto rotate-180" />
          </div>
          <div className="text-white font-orbitron text-xl">Loading...</div>
          <div className="text-gray-500 text-sm mt-2">Connecting to the Giga Brain Galaxy</div>
        </div>
      </div>
    );
  }
  
  if (loadError) {
    return <GlobalErrorFallback />;
  }

  return (
    <ErrorBoundary fallback={<GlobalErrorFallback />}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider 
            theme={darkTheme({
              accentColor: '#00ffff',
              accentColorForeground: 'black',
              borderRadius: 'medium',
              fontStack: 'system',
              overlayBlur: 'small',
            })}
            modalSize="wide"
            initialChain={32323}
            showRecentTransactions={true}
            appInfo={{
              appName: 'Based Guardians',
              learnMoreUrl: 'https://basedguardians.com',
            }}
          >
            <SecurityProvider>
              <TransactionProvider>
                <GuardianProfileProvider>
                  <NotificationsProvider>
                    <TooltipProvider>
                      <WelcomeExperienceWrapper>
                        <NotificationWatcherSetup />
                        <HealthCheckBanner />
                        <NetworkSwitchBanner />
                        <DegradationBanner />
                        <SpaceBackground />
                        <Router />
                        <DisclaimerModal />
                        <OnboardingTour />
                        <GlobalBuyListener />
                        <WalletWatcher />
                        <PendingTxBanner />
                        <PendingPurchaseBanner />
                        <Toaster />
                        <DiagnosticPanel />
                        <LanguageSelector />
                      </WelcomeExperienceWrapper>
                    </TooltipProvider>
                  </NotificationsProvider>
                </GuardianProfileProvider>
              </TransactionProvider>
            </SecurityProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
