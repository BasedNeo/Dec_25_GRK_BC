/**
 * Central Type Definitions
 * This file contains shared type definitions used across the application.
 * Import types from '@/types' for consistency.
 */

// Re-export protected core types
export type {
  MintResult,
  ListingData,
  OfferData,
  GameAccessState,
  PlayerStats,
  WalletState,
} from '@/core/types';

// Re-export notification types
export type {
  NotificationType,
  Notification,
  NotificationPreferences,
} from '@/lib/notifications/types';

// NFT Types
export interface NFT {
  tokenId: string;
  owner: string;
  imageUrl: string;
  name: string;
  price?: string;
  isListed: boolean;
  listedPrice?: string;
  attributes?: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

// Marketplace Types
export interface Listing {
  tokenId: string;
  seller: string;
  price: string;
  timestamp: number;
  active: boolean;
}

export interface Offer {
  id: string;
  tokenId: string;
  buyer: string;
  seller?: string;
  price: string;
  timestamp: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  signature?: string;
}

// Game Types
export interface GameStats {
  gamesPlayed: number;
  highScore: number;
  totalScore: number;
  playsToday: number;
  lastPlayDate: string;
  achievements?: string[];
  averageScore?: number;
}

export interface GameSave {
  gameId: string;
  saveData: Record<string, unknown>;
  timestamp: number;
  version: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  [key: string]: unknown;
}

// Activity Types
export interface ActivityEvent {
  type: 'mint' | 'sale' | 'listing' | 'transfer' | 'offer' | 'delisted';
  tokenId: string;
  from?: string;
  to?: string;
  price?: string;
  timestamp: number;
  blockNumber: number;
  txHash: string;
}

// User Types
export interface UserProfile {
  address: string;
  ownedNFTs: NFT[];
  customName?: string;
  stats: UserStats;
}

export interface UserStats {
  nftsMinted: number;
  nftsSold: number;
  nftsBought: number;
  totalVolume: string;
  gamesPlayed: number;
  totalGameScore: number;
}

// Proposal Types (Governance)
export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  startTime: number;
  endTime: number;
  votesFor: string;
  votesAgainst: string;
  executed: boolean;
  cancelled: boolean;
  cancelledAt?: number;
  cancelledBy?: string;
  cancelReason?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Emission Types
export interface EmissionData {
  brainAddress: string;
  status: 'active' | 'inactive';
  emissionsPerBlock: string;
  lastEventBlock: number;
  firstEventBlock: number;
  totalEmissions: string;
}

// Price Types
export interface PriceData {
  btc: number;
  eth: number;
  lastUpdated: number;
  source: string;
  isStale: boolean;
}

// Transaction Types
export interface PendingTransaction {
  hash: string;
  type: 'mint' | 'buy' | 'list' | 'delist' | 'offer' | 'vote' | 'transfer';
  description: string;
  timestamp: number;
}

// Pagination Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Filter Types
export interface MarketplaceFilters {
  priceMin?: number;
  priceMax?: number;
  rarity?: string[];
  traits?: Record<string, string[]>;
  status?: 'all' | 'listed' | 'unlisted';
  sortBy?: 'price' | 'id' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

// Address Type
export type EthAddress = `0x${string}`;

// Common utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
