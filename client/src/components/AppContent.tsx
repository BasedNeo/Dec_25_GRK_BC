import { useState, useEffect } from "react";
import { Router } from "@/App";
import { MatrixWelcomeOverlay } from "@/components/MatrixWelcomeOverlay";
import { useWelcomeExperience } from "@/hooks/useWelcomeExperience";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { SpaceBackground } from "@/components/SpaceBackground";
import { OnboardingTour } from "@/components/OnboardingTour";
import { GlobalBuyListener } from "@/components/GlobalBuyListener";
import { WalletWatcher } from "@/components/WalletWatcher";
import { NetworkSwitchBanner } from "@/components/NetworkSwitchBanner";
import { DegradationBanner } from "@/components/DegradationBanner";
import { PendingTxBanner } from "@/components/PendingTxBanner";
import { PendingPurchaseBanner } from "@/components/PendingPurchaseBanner";
import { DiagnosticPanel } from "@/components/DiagnosticPanel";
import { HealthCheckBanner } from "@/components/HealthCheckBanner";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useNotificationWatchers } from "@/hooks/useNotificationWatchers";
import { initAnalytics } from "@/lib/analytics";

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

export default function AppContent() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
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
      <DiagnosticPanel />
      <LanguageSelector />
    </WelcomeExperienceWrapper>
  );
}
