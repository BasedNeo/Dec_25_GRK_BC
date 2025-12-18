import { GameType } from './gameRegistry';

/**
 * Storage configuration
 */
const STORAGE_PREFIX = 'guardian-game';
const MAX_STORAGE_AGE_DAYS = 7;
const MAX_STORAGE_SIZE_KB = 100;
const STORAGE_VERSION = '1.0';

/**
 * Saved game state structure
 * Generic to support any game type
 */
export interface GameSave<T = any> {
  gameType: GameType;
  address: string;
  state: T;
  timestamp: number;
  version: string;
  checksum?: string; // For integrity verification
}

/**
 * Unified stats structure across all games
 * Consistent shape enables cross-game analytics
 */
export interface GameStats {
  // Play counts
  gamesPlayed: number;
  gamesWon: number;
  
  // Performance
  totalScore: number;
  totalTime: number;
  bestScore: number;
  bestTime: number;
  bestMoves?: number;
  
  // Streaks
  currentStreak: number;
  longestStreak: number;
  
  // Timestamps
  lastPlayed: number;
  firstPlayed: number;
  
  // Calculated fields (computed on load)
  averageScore?: number;
  averageTime?: number;
  winRate?: number;
}

/**
 * Game settings structure
 * Each game can extend this with custom settings
 */
export interface GameSettings {
  soundEnabled: boolean;
  soundVolume: number;
  animationSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  particleIntensity: 'off' | 'low' | 'medium' | 'high';
}

/**
 * Storage health check result
 */
export interface StorageHealth {
  healthy: boolean;
  totalKB: number;
  warnings: string[];
  byGame: Record<string, number>;
}

/**
 * GAME STORAGE MANAGER
 * Centralized localStorage management for all games
 * 
 * Benefits:
 * - Automatic cleanup of old saves
 * - Version management
 * - Error handling
 * - Storage quota monitoring
 * - Cross-game consistency
 */
export class GameStorageManager {
  
  // ═══════════════════════════════════════════════════════════
  // SAVE GAME STATE
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Save game state to localStorage
   * Automatically adds timestamp and version
   */
  static saveSave<T>(
    gameType: GameType, 
    address: string, 
    state: T
  ): boolean {
    try {
      const save: GameSave<T> = {
        gameType,
        address,
        state,
        timestamp: Date.now(),
        version: STORAGE_VERSION,
      };
      
      const key = this.getSaveKey(gameType, address);
      const serialized = JSON.stringify(save);
      
      localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      console.error(`[GameStorage] Failed to save ${gameType}:`, err);
      
      // Handle quota exceeded
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        console.warn('[GameStorage] Quota exceeded, cleaning up old saves...');
        this.cleanupOldSaves(address);
        
        // Retry once after cleanup
        try {
          const key = this.getSaveKey(gameType, address);
          const save: GameSave<T> = {
            gameType,
            address,
            state,
            timestamp: Date.now(),
            version: STORAGE_VERSION,
          };
          localStorage.setItem(key, JSON.stringify(save));
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    }
  }
  
  /**
   * Load game state from localStorage
   * Returns null if not found or expired
   */
  static loadSave<T>(gameType: GameType, address: string): GameSave<T> | null {
    try {
      const key = this.getSaveKey(gameType, address);
      const data = localStorage.getItem(key);
      
      if (!data) return null;
      
      const save: GameSave<T> = JSON.parse(data);
      
      // Validate structure
      if (!save.gameType || !save.state || !save.timestamp) {
        console.warn('[GameStorage] Invalid save structure, removing...');
        this.deleteSave(gameType, address);
        return null;
      }
      
      // Check expiration
      const age = Date.now() - save.timestamp;
      const maxAge = MAX_STORAGE_AGE_DAYS * 24 * 60 * 60 * 1000;
      
      if (age > maxAge) {
        this.deleteSave(gameType, address);
        return null;
      }
      
      return save;
    } catch (err) {
      console.error(`[GameStorage] Failed to load ${gameType}:`, err);
      return null;
    }
  }
  
  /**
   * Delete a saved game
   */
  static deleteSave(gameType: GameType, address: string): void {
    const key = this.getSaveKey(gameType, address);
    localStorage.removeItem(key);
  }
  
  /**
   * Check if a save exists
   */
  static hasSave(gameType: GameType, address: string): boolean {
    return this.loadSave(gameType, address) !== null;
  }
  
  // ═══════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Save game statistics
   */
  static saveStats(
    gameType: GameType, 
    address: string, 
    stats: GameStats
  ): boolean {
    try {
      // Add calculated fields
      const enrichedStats: GameStats = {
        ...stats,
        averageScore: stats.gamesPlayed > 0 
          ? Math.round(stats.totalScore / stats.gamesPlayed) 
          : 0,
        averageTime: stats.gamesWon > 0 
          ? Math.round(stats.totalTime / stats.gamesWon) 
          : 0,
        winRate: stats.gamesPlayed > 0 
          ? (stats.gamesWon / stats.gamesPlayed) * 100 
          : 0,
      };
      
      const key = this.getStatsKey(gameType, address);
      localStorage.setItem(key, JSON.stringify(enrichedStats));
      return true;
    } catch (err) {
      console.error(`[GameStorage] Failed to save stats for ${gameType}:`, err);
      return false;
    }
  }
  
  /**
   * Load game statistics
   */
  static loadStats(gameType: GameType, address: string): GameStats {
    try {
      const key = this.getStatsKey(gameType, address);
      const data = localStorage.getItem(key);
      
      if (!data) {
        return this.getDefaultStats();
      }
      
      const stats: GameStats = JSON.parse(data);
      
      // Recalculate derived fields in case they're stale
      stats.averageScore = stats.gamesPlayed > 0 
        ? Math.round(stats.totalScore / stats.gamesPlayed) 
        : 0;
      stats.averageTime = stats.gamesWon > 0 
        ? Math.round(stats.totalTime / stats.gamesWon) 
        : 0;
      stats.winRate = stats.gamesPlayed > 0 
        ? (stats.gamesWon / stats.gamesPlayed) * 100 
        : 0;
      
      return stats;
    } catch (err) {
      console.error(`[GameStorage] Failed to load stats for ${gameType}:`, err);
      return this.getDefaultStats();
    }
  }
  
  /**
   * Get default stats structure
   */
  static getDefaultStats(): GameStats {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      totalScore: 0,
      totalTime: 0,
      bestScore: 0,
      bestTime: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayed: 0,
      firstPlayed: Date.now(),
      averageScore: 0,
      averageTime: 0,
      winRate: 0,
    };
  }
  
  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Save game-specific settings
   */
  static saveSettings<T extends GameSettings>(
    gameType: GameType, 
    settings: T
  ): boolean {
    try {
      const key = this.getSettingsKey(gameType);
      localStorage.setItem(key, JSON.stringify(settings));
      return true;
    } catch (err) {
      console.error(`[GameStorage] Failed to save settings for ${gameType}:`, err);
      return false;
    }
  }
  
  /**
   * Load game-specific settings
   * Merges with defaults to handle new settings added in updates
   */
  static loadSettings<T extends GameSettings>(
    gameType: GameType, 
    defaultSettings: T
  ): T {
    try {
      const key = this.getSettingsKey(gameType);
      const data = localStorage.getItem(key);
      
      if (!data) return defaultSettings;
      
      const saved = JSON.parse(data);
      
      // Merge with defaults (handles new settings gracefully)
      return { ...defaultSettings, ...saved };
    } catch (err) {
      console.error(`[GameStorage] Failed to load settings for ${gameType}:`, err);
      return defaultSettings;
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // CLEANUP & MAINTENANCE
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Clean up old and orphaned saves
   * Returns number of items cleaned
   */
  static cleanupOldSaves(address: string): number {
    let cleaned = 0;
    const maxAge = MAX_STORAGE_AGE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`${STORAGE_PREFIX}-save-`)) continue;
        
        try {
          const data = localStorage.getItem(key);
          if (!data) {
            localStorage.removeItem(key);
            cleaned++;
            continue;
          }
          
          const save = JSON.parse(data);
          const age = now - save.timestamp;
          
          // Remove if expired or wrong address
          if (age > maxAge || save.address !== address) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch {
          // Invalid data, remove it
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    } catch (err) {
      console.error('[GameStorage] Cleanup failed:', err);
    }
    
    return cleaned;
  }
  
  /**
   * Get storage usage breakdown
   */
  static getStorageUsage(): StorageHealth['byGame'] & { total: number } {
    let totalBytes = 0;
    const byGame: Record<string, number> = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
        
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        const bytes = new Blob([value]).size;
        totalBytes += bytes;
        
        // Extract game type from key
        const match = key.match(
          new RegExp(`${STORAGE_PREFIX}-(save|stats|settings)-([^-]+)`)
        );
        
        if (match) {
          const gameType = match[2];
          byGame[gameType] = (byGame[gameType] || 0) + bytes;
        }
      }
    } catch (err) {
      console.error('[GameStorage] Usage calculation failed:', err);
    }
    
    return {
      total: totalBytes,
      ...Object.fromEntries(
        Object.entries(byGame).map(([k, v]) => [k, Math.round(v / 1024)])
      ),
    };
  }
  
  /**
   * Check storage health
   * Returns warnings if storage is getting full or has issues
   */
  static checkStorageHealth(): StorageHealth {
    const warnings: string[] = [];
    const usage = this.getStorageUsage();
    const totalKB = Math.round(usage.total / 1024);
    
    if (totalKB > MAX_STORAGE_SIZE_KB) {
      warnings.push(
        `Total storage (${totalKB}KB) exceeds recommended ${MAX_STORAGE_SIZE_KB}KB`
      );
    }
    
    Object.entries(usage).forEach(([game, kb]) => {
      if (game === 'total') return;
      
      if (typeof kb === 'number' && kb > MAX_STORAGE_SIZE_KB / 2) {
        warnings.push(
          `Game "${game}" storage (${kb}KB) is unusually large`
        );
      }
    });
    
    // Check for corrupted data
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
        
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        try {
          JSON.parse(value);
        } catch {
          warnings.push(`Corrupted data found: ${key}`);
        }
      }
    } catch (err) {
      warnings.push('Failed to verify data integrity');
    }
    
    return {
      healthy: warnings.length === 0,
      totalKB,
      warnings,
      byGame: Object.fromEntries(
        Object.entries(usage)
          .filter(([k]) => k !== 'total')
          .map(([k, v]) => [k, v as number])
      ),
    };
  }
  
  /**
   * Export all player data for a specific address
   * Used for data portability or debugging
   */
  static exportPlayerData(address: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(STORAGE_PREFIX) || !key.includes(address)) {
          continue;
        }
        
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    } catch (err) {
      console.error('[GameStorage] Export failed:', err);
    }
    
    return data;
  }
  
  /**
   * Clear all data for a specific game and address
   */
  static clearGameData(gameType: GameType, address: string): void {
    this.deleteSave(gameType, address);
    // Intentionally keep stats - player history is valuable
  }
  
  // ═══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════
  
  private static getSaveKey(gameType: GameType, address: string): string {
    return `${STORAGE_PREFIX}-save-${gameType}-${address}`;
  }
  
  private static getStatsKey(gameType: GameType, address: string): string {
    return `${STORAGE_PREFIX}-stats-${gameType}-${address}`;
  }
  
  private static getSettingsKey(gameType: GameType): string {
    return `${STORAGE_PREFIX}-settings-${gameType}`;
  }
}

/**
 * AUTO-CLEANUP ON APP LOAD
 * Runs once when the app initializes
 * Non-blocking, runs after 2 seconds
 */
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const address = localStorage.getItem('last-connected-wallet');
        if (address) {
          GameStorageManager.cleanupOldSaves(address);
        }
      } catch (err) {
        console.error('[GameStorage] Auto-cleanup failed:', err);
      }
    }, 2000);
  });
}
