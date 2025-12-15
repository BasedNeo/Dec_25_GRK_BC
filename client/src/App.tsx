import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/not-found";
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
import { PendingTxBanner } from "@/components/PendingTxBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DiagnosticPanel } from "@/components/DiagnosticPanel";
import { RefreshCw } from "lucide-react";

function GlobalErrorFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-orbitron text-red-500 mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-6">Please refresh the page or try again later.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors inline-flex items-center gap-2"
          data-testid="button-refresh-page"
        >
          <RefreshCw className="h-4 w-4" />
          REFRESH PAGE
        </button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

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
            })}
            modalSize="compact"
            initialChain={32323}
          >
            <SecurityProvider>
              <TransactionProvider>
                <TooltipProvider>
                  <NetworkSwitchBanner />
                  <SpaceBackground />
                  <Router />
                  <DisclaimerModal />
                  <OnboardingTour />
                  <GlobalBuyListener />
                  <WalletWatcher />
                  <PendingTxBanner />
                  <Toaster />
                  <DiagnosticPanel />
                </TooltipProvider>
              </TransactionProvider>
            </SecurityProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
