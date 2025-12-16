import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface GuardianProfile {
  id: string;
  walletAddress: string;
  customName: string | null;
  lastLogin: string;
  createdAt: string;
}

const WELCOME_MESSAGES = [
  "The based realm welcomes you back, Guardian. The fight continues.",
  "Guardians never rest for long. Your return strengthens us all.",
  "The Based Life community missed you. Ready for action?",
  "Welcome back, legend. The blockchain remembers your deeds."
];

export function useGuardianProfile() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const getDisplayName = useCallback(() => {
    if (!address) return null;
    const suffix = address.slice(-3).toUpperCase();
    if (profile?.customName) {
      return `${profile.customName}#${suffix}`;
    }
    return null;
  }, [profile, address]);

  const login = useCallback(async () => {
    if (!address || !isConnected) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/profile/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setIsNewUser(data.isNew);
        
        if (data.isNew) {
          const hasSeenPrompt = localStorage.getItem(`namePromptSeen_${address.toLowerCase()}`);
          if (!hasSeenPrompt) {
            setShowNamePrompt(true);
          }
        } else if (data.showWelcomeBack) {
          const lastWelcome = localStorage.getItem(`lastWelcomeIndex_${address.toLowerCase()}`);
          const lastIndex = lastWelcome ? parseInt(lastWelcome) : -1;
          const nextIndex = (lastIndex + 1) % WELCOME_MESSAGES.length;
          setWelcomeMessage(WELCOME_MESSAGES[nextIndex]);
          localStorage.setItem(`lastWelcomeIndex_${address.toLowerCase()}`, nextIndex.toString());
        }
      }
    } catch (e) {
      console.error('Failed to login:', e);
    }
    setLoading(false);
  }, [address, isConnected]);

  const setCustomName = useCallback(async (name: string | null): Promise<{ success: boolean; error?: string }> => {
    if (!address) return { success: false, error: 'No wallet connected' };
    
    try {
      const res = await fetch('/api/profile/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, customName: name }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        return { success: true };
      } else {
        const error = await res.json();
        return { success: false, error: error.error || 'Failed to set name' };
      }
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [address]);

  const checkNameAvailable = useCallback(async (name: string): Promise<boolean> => {
    if (!name || name.length < 2) return false;
    
    try {
      const res = await fetch(`/api/profile/check-name/${encodeURIComponent(name)}?exclude=${address || ''}`);
      if (res.ok) {
        const data = await res.json();
        return data.available;
      }
    } catch {
      return false;
    }
    return false;
  }, [address]);

  const dismissNamePrompt = useCallback(() => {
    if (address) {
      localStorage.setItem(`namePromptSeen_${address.toLowerCase()}`, 'true');
    }
    setShowNamePrompt(false);
  }, [address]);

  const dismissWelcome = useCallback(() => {
    setWelcomeMessage(null);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      login();
    } else {
      setProfile(null);
      setIsNewUser(false);
      setWelcomeMessage(null);
      setShowNamePrompt(false);
    }
  }, [isConnected, address, login]);

  return {
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
    walletSuffix: address ? address.slice(-3).toUpperCase() : '',
  };
}
