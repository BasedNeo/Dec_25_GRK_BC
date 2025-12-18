import { useState, useEffect } from 'react';

export interface FeatureFlags {
  mintingEnabled: boolean;
  marketplaceEnabled: boolean;
  offersEnabled: boolean;
  gameEnabled: boolean;
  customNamesEnabled: boolean;
  votingEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  mintingEnabled: true,
  marketplaceEnabled: true,
  offersEnabled: true,
  gameEnabled: true,
  customNamesEnabled: true,
  votingEnabled: true,
};

let cachedFlags: FeatureFlags | null = null;
let lastFetch = 0;
const CACHE_DURATION = 30000;

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  if (cachedFlags && Date.now() - lastFetch < CACHE_DURATION) {
    return cachedFlags;
  }

  try {
    const res = await fetch('/api/feature-flags');
    const data = await res.json();
    
    const flags: FeatureFlags = { ...DEFAULT_FLAGS };
    data.forEach((flag: any) => {
      if (flag.key in flags) {
        flags[flag.key as keyof FeatureFlags] = flag.enabled;
      }
    });
    
    cachedFlags = flags;
    lastFetch = Date.now();
    return flags;
  } catch (error) {
    console.error('[FeatureFlags] Failed to fetch, using defaults:', error);
    return DEFAULT_FLAGS;
  }
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(cachedFlags || DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(!cachedFlags);

  useEffect(() => {
    fetchFeatureFlags().then(newFlags => {
      setFlags(newFlags);
      setIsLoading(false);
    });

    const interval = setInterval(async () => {
      const newFlags = await fetchFeatureFlags();
      setFlags(newFlags);
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, []);

  return { flags, isLoading };
}

export function invalidateFeatureFlagsCache() {
  cachedFlags = null;
  lastFetch = 0;
}

export async function updateFeatureFlag(key: keyof FeatureFlags, enabled: boolean, updatedBy: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/feature-flags/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, updatedBy }),
    });
    
    if (res.ok) {
      invalidateFeatureFlagsCache();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
