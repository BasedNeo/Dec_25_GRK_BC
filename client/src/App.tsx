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
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

function GlobalErrorFallback() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-orbitron text-red-500 mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">Please refresh the page or try again later.</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-primary text-black font-bold"
          data-testid="button-refresh-page"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          REFRESH PAGE
        </Button>
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
          <RainbowKitProvider theme={darkTheme({
            accentColor: '#00ffff',
            accentColorForeground: 'black',
            borderRadius: 'none',
            fontStack: 'system',
          })}>
            <SecurityProvider>
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
              </TooltipProvider>
            </SecurityProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
