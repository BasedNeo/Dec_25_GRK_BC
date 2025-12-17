/**
 * Feature flags allow enabling/disabling features without code changes.
 * Toggle features for testing, gradual rollout, or emergency shutoff.
 */

interface FeatureFlags {
  mintingEnabled: boolean;
  marketplaceEnabled: boolean;
  offersV3Enabled: boolean;
  gameEnabled: boolean;
  gameLeaderboardEnabled: boolean;
  offerMessagingEnabled: boolean;
  debugMode: boolean;
  showDiagnostics: boolean;
}

const PRODUCTION_FLAGS: FeatureFlags = {
  mintingEnabled: true,
  marketplaceEnabled: true,
  offersV3Enabled: true,
  gameEnabled: true,
  gameLeaderboardEnabled: true,
  offerMessagingEnabled: true,
  debugMode: false,
  showDiagnostics: false,
};

function getFlags(): FeatureFlags {
  if (typeof window === 'undefined') return PRODUCTION_FLAGS;
  const stored = localStorage.getItem('feature_flags');
  if (stored) {
    try {
      return { ...PRODUCTION_FLAGS, ...JSON.parse(stored) };
    } catch {
      return PRODUCTION_FLAGS;
    }
  }
  return PRODUCTION_FLAGS;
}

export const flags = getFlags();

export function setFlag(key: keyof FeatureFlags, value: boolean): void {
  const current = getFlags();
  current[key] = value;
  localStorage.setItem('feature_flags', JSON.stringify(current));
  window.location.reload();
}

export function useFeatureFlags(): FeatureFlags {
  return flags;
}
