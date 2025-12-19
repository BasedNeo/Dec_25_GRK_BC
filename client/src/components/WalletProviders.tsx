import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/wagmi";
import { SecurityProvider } from "@/context/SecurityContext";
import { TransactionProvider } from "@/context/TransactionContext";
import { GuardianProfileProvider } from "@/components/GuardianProfileProvider";
import { NotificationsProvider } from "@/context/NotificationsContext";

interface WalletProvidersProps {
  children: ReactNode;
}

export default function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <WagmiProvider config={config}>
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
                {children}
              </NotificationsProvider>
            </GuardianProfileProvider>
          </TransactionProvider>
        </SecurityProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
