import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface GuardianProfile {
  id: string;
  walletAddress: string;
  customName: string | null;
  lastLogin: string;
  createdAt: string;
}

const RETURNING_MESSAGES = [
  "Missed you out there. The chain kept your spot warm.",
  "Look who's back. The Based realm just got a little brighter.",
  "The frogs were starting to worry. Good to see you.",
  "Your Guardian was getting restless. Time to ride.",
  "24 hours? That's practically forever in crypto time.",
  "The Based Life doesn't pause. Neither do you.",
];

const FREQUENT_MESSAGES = [
  "Back already? We respect the grind.",
  "You really can't stay away, can you? Same.",
  "Three visits this week? You might be Based.",
  "At this point, you basically live here. Welcome home.",
  "The dedication is unreal. Keep stacking.",
  "Another day, another check-in. You're built different.",
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
          const visitCountKey = `visitCount_${address.toLowerCase()}`;
          const visitCount = parseInt(localStorage.getItem(visitCountKey) || '0') + 1;
          localStorage.setItem(visitCountKey, visitCount.toString());
          
          const messages = visitCount >= 5 ? FREQUENT_MESSAGES : RETURNING_MESSAGES;
          const lastWelcome = localStorage.getItem(`lastWelcomeIndex_${address.toLowerCase()}`);
          const lastIndex = lastWelcome ? parseInt(lastWelcome) : -1;
          const nextIndex = (lastIndex + 1) % messages.length;
          setWelcomeMessage(messages[nextIndex]);
          localStorage.setItem(`lastWelcomeIndex_${address.toLowerCase()}`, nextIndex.toString());
        }
      }
    } catch {
      // Login failed silently
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
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [address]);

  const checkNameAvailable = useCallback(async (name: string): Promise<{ available: boolean; error?: string }> => {
    if (!name || name.length < 2) {
      return { available: false, error: 'Name must be at least 2 characters' };
    }
    
    try {
      const url = `/api/profile/check-name/${encodeURIComponent(name)}${address ? `?exclude=${address}` : ''}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        return { available: data.available };
      } else {
        return { available: false, error: 'Could not verify name availability' };
      }
    } catch (err) {
      return { available: false, error: 'Network error checking name' };
    }
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
