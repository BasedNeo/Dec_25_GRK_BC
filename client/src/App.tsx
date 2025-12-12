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
import { AnimatedBackground } from "@/components/AnimatedBackground"; // Updated
import { OnboardingTour } from "@/components/OnboardingTour";

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
              <AnimatedBackground /> {/* Updated */}
              <Router />
              <DisclaimerModal />
              <OnboardingTour />
              <Toaster />
            </TooltipProvider>
          </SecurityProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
