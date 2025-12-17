import { createContext, useContext, ReactNode } from 'react';
import { useGuardianProfile, GuardianProfile } from '@/hooks/useGuardianProfile';
import { WelcomeBackModal, NamePromptModal } from './GuardianWelcome';

interface GuardianProfileContextType {
  profile: GuardianProfile | null;
  loading: boolean;
  isNewUser: boolean;
  getDisplayName: () => string | null;
  setCustomName: (name: string | null) => Promise<{ success: boolean; error?: string }>;
  checkNameAvailable: (name: string) => Promise<{ available: boolean; error?: string }>;
  walletSuffix: string;
}

const GuardianProfileContext = createContext<GuardianProfileContextType | null>(null);

export function useGuardianProfileContext() {
  const context = useContext(GuardianProfileContext);
  if (!context) {
    return {
      profile: null,
      loading: false,
      isNewUser: false,
      getDisplayName: () => null,
      setCustomName: async () => ({ success: false, error: 'Provider not available' }),
      checkNameAvailable: async () => ({ available: false, error: 'Provider not available' }),
      walletSuffix: '',
    };
  }
  return context;
}

interface GuardianProfileProviderProps {
  children: ReactNode;
}

export function GuardianProfileProvider({ children }: GuardianProfileProviderProps) {
  const {
    profile,
    loading,
    isNewUser,
    welcomeMessage,
    showNamePrompt,
    getDisplayName,
    setCustomName,
    checkNameAvailable,
    dismissNamePrompt,
    dismissWelcome,
    walletSuffix,
  } = useGuardianProfile();

  return (
    <GuardianProfileContext.Provider
      value={{
        profile,
        loading,
        isNewUser,
        getDisplayName,
        setCustomName,
        checkNameAvailable,
        walletSuffix,
      }}
    >
      {children}
      
      {welcomeMessage && (
        <WelcomeBackModal
          message={welcomeMessage}
          displayName={getDisplayName()}
          onDismiss={dismissWelcome}
        />
      )}
      
      {showNamePrompt && (
        <NamePromptModal
          walletSuffix={walletSuffix}
          onSubmit={setCustomName}
          onCheckAvailable={checkNameAvailable}
          onDismiss={dismissNamePrompt}
        />
      )}
    </GuardianProfileContext.Provider>
  );
}
