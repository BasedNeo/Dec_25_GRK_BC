import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { requestDedup } from '@/lib/requestDeduplicator';

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

interface GuardianProfileResult {
  profile: GuardianProfile | null;
  loading: boolean;
  isNewUser: boolean;
  welcomeMessage: string | null;
  showNamePrompt: boolean;
  getDisplayName: () => string | null;
  setCustomName: (name: string | null) => Promise<{ success: boolean; error?: string }>;
  checkNameAvailable: (name: string) => Promise<{ available: boolean; error?: string }>;
  dismissNamePrompt: () => void;
  dismissWelcome: () => void;
  walletSuffix: string;
}

export function useGuardianProfile(): GuardianProfileResult {
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
    
    return requestDedup.execute(`profile-login-${address}`, async () => {
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
    });
  }, [address, isConnected]);

  const setCustomName = useCallback(async (name: string | null): Promise<{ success: boolean; error?: string }> => {
    if (!address) return { success: false, error: 'No wallet connected' };
    
    const maxRetries = 3;
    let lastError = 'Failed to set name';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch('/api/profile/name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address, customName: name }),
          signal: controller.signal,
        });
        
        clearTimeout(timeout);
        
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          return { success: true };
        } else {
          const error = await res.json();
          lastError = error.error || 'Failed to set name';
          if (res.status === 400 || res.status === 409) {
            return { success: false, error: lastError };
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          lastError = 'Request timed out';
        } else {
          lastError = 'Network error';
        }
        console.warn(`[Profile] Set name attempt ${attempt}/${maxRetries} failed:`, err);
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return { success: false, error: lastError };
  }, [address]);

  const checkNameAvailable = useCallback(async (name: string): Promise<{ available: boolean; error?: string }> => {
    if (!name || name.length < 2) {
      return { available: false, error: 'Name must be at least 2 characters' };
    }
    
    if (name.length > 16) {
      return { available: false, error: 'Name must be 16 characters or less' };
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return { available: false, error: 'Only letters, numbers, underscore, hyphen allowed' };
    }
    
    try {
      const url = `/api/profile/check-name/${encodeURIComponent(name)}${address ? `?exclude=${address}` : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      const data = await res.json().catch(() => null);
      
      if (data) {
        if (data.error) {
          return { available: false, error: data.error };
        }
        return { available: data.available ?? false };
      }
      
      console.warn('[Profile] Could not parse name check response');
      return { available: true, error: undefined };
    } catch (err) {
      console.error('[Profile] Network error checking name:', err);
      return { available: true, error: 'Could not verify (will check on save)' };
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
