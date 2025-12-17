/**
 * PROTECTED: These types define the interface contracts.
 * Changing these may break dependent code.
 */

// === COMMERCE TYPES ===
export interface MintResult {
  success: boolean;
  txHash?: string;
  tokenId?: number;
  error?: string;
}

export interface ListingData {
  tokenId: number;
  price: bigint;
  seller: `0x${string}`;
  active: boolean;
}

export interface OfferData {
  id: string;
  tokenId: number;
  amount: bigint;
  buyer: `0x${string}`;
  expiration: number;
  status: 'pending' | 'accepted' | 'completed' | 'expired' | 'cancelled';
  signature?: string;
  message?: string;
}

// === GAME TYPES ===
export interface GameAccessState {
  canPlay: boolean;
  reason: string;
  playsRemaining: number;
  cooldownSeconds: number;
}

export interface PlayerStats {
  lifetimeScore: number;
  bestScore: number;
  gamesPlayed: number;
  rank: string;
}

// === AUTH TYPES ===
export interface WalletState {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isHolder: boolean;
  balance: bigint;
}
