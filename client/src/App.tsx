import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import '@/lib/i18n';
import { lazy, Suspense, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Rocket } from "lucide-react";
import { connectionManager } from "@/lib/connectionManager";
import { lazyWithRetry, routeImports } from "@/lib/lazyWithRetry";

const Home = lazyWithRetry(routeImports.Home);
const TermsOfService = lazyWithRetry(routeImports.TermsOfService);
const PrivacyPolicy = lazyWithRetry(routeImports.PrivacyPolicy);
const Odyssey = lazyWithRetry(routeImports.Odyssey);
const Creators = lazyWithRetry(routeImports.Creators);
const Saga = lazyWithRetry(routeImports.Saga);
const GuardianDefender = lazyWithRetry(routeImports.GuardianDefender);
const GuardianDefense = lazyWithRetry(routeImports.GuardianDefense);
const GuardianSolitaire = lazyWithRetry(routeImports.GuardianSolitaire);
const AsteroidMining = lazyWithRetry(routeImports.AsteroidMining);
const CyberBreach = lazyWithRetry(routeImports.CyberBreach);
const BasedArcade = lazyWithRetry(routeImports.BasedArcade);
const TransactionHistory = lazyWithRetry(routeImports.TransactionHistory);
const Collections = lazyWithRetry(routeImports.Collections);
const Marketplace = lazyWithRetry(routeImports.Marketplace);
const NotFound = lazyWithRetry(routeImports.NotFound);

const WalletProviders = lazy(() => import("@/components/WalletProviders"));
const AppContent = lazy(() => import("@/components/AppContent"));

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

function AppLoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="text-white text-xl font-orbitron font-semibold mb-2">Loading...</p>
        <p className="text-cyan-300/70 text-sm">Connecting to the Giga Brain Galaxy</p>
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

export function Router() {
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
        <Route path="/games/cyber-breach">
          <ErrorBoundary feature="Cyber Breach">
            <CyberBreach />
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
        <Route path="/collections">
          <ErrorBoundary feature="Collections">
            <Collections />
          </ErrorBoundary>
        </Route>
        <Route path="/marketplace">
          <ErrorBoundary feature="Marketplace">
            <Marketplace />
          </ErrorBoundary>
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    try {
      connectionManager.startAutoCheck(30000);
      console.log('[App] Connection manager initialized');
    } catch (error) {
      console.error('[App] Connection manager failed to initialize:', error);
    }
    
    return () => {
      try {
        connectionManager.stopAutoCheck();
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []);

  return (
    <ErrorBoundary fallback={<GlobalErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<AppLoadingFallback />}>
            <WalletProviders>
              <AppContent />
            </WalletProviders>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
