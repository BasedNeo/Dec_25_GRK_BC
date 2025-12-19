import { db } from '../db';
import { featureGating } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class GatingService {
  
  static async initializeDefaultRules() {
    const defaults = [
      {
        featureKey: 'arcade',
        featureName: 'Based Arcade',
        requiresNFT: true,
        requiredCollection: null,
        minimumBalance: 1,
        bypassForAdmin: true,
        enabled: true,
        gateMessage: 'The Based Arcade is an exclusive gaming zone for Guardian NFT holders.'
      },
      {
        featureKey: 'game_solitaire',
        featureName: 'Guardian Solitaire',
        requiresNFT: true,
        requiredCollection: null,
        minimumBalance: 1,
        bypassForAdmin: true,
        enabled: true,
        gateMessage: 'Guardian Solitaire is exclusive to NFT holders.'
      },
      {
        featureKey: 'game_asteroid',
        featureName: 'Asteroid Mining',
        requiresNFT: true,
        requiredCollection: null,
        minimumBalance: 1,
        bypassForAdmin: true,
        enabled: true,
        gateMessage: 'Asteroid Mining is exclusive to NFT holders.'
      },
      {
        featureKey: 'game_defense',
        featureName: 'Guardian Defense',
        requiresNFT: true,
        requiredCollection: null,
        minimumBalance: 1,
        bypassForAdmin: true,
        enabled: true,
        gateMessage: 'Guardian Defense is exclusive to NFT holders.'
      },
      {
        featureKey: 'governance',
        featureName: 'Governance Voting',
        requiresNFT: false,
        requiredCollection: null,
        minimumBalance: 1,
        bypassForAdmin: false,
        enabled: true,
        gateMessage: 'Voting on proposals requires Guardian NFT ownership.'
      },
      {
        featureKey: 'custom_names',
        featureName: 'Custom NFT Names',
        requiresNFT: false,
        requiredCollection: null,
        minimumBalance: 1,
        bypassForAdmin: false,
        enabled: true,
        gateMessage: 'Custom names are available to all users.'
      }
    ];

    for (const rule of defaults) {
      try {
        const existing = await db.select()
          .from(featureGating)
          .where(eq(featureGating.featureKey, rule.featureKey))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(featureGating).values(rule);
          console.log(`[Gating] Created rule: ${rule.featureName}`);
        }
      } catch (error) {
        console.error(`[Gating] Failed to create rule for ${rule.featureKey}:`, error);
      }
    }
  }

  static async getGatingRule(featureKey: string) {
    const result = await db.select()
      .from(featureGating)
      .where(eq(featureGating.featureKey, featureKey))
      .limit(1);
    
    return result[0] || null;
  }

  static async getAllGatingRules() {
    return await db.select().from(featureGating);
  }

  static async updateGatingRule(featureKey: string, updates: Partial<{
    requiresNFT: boolean;
    requiredCollection: string | null;
    minimumBalance: number;
    bypassForAdmin: boolean;
    enabled: boolean;
    gateMessage: string;
  }>) {
    await db.update(featureGating)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(featureGating.featureKey, featureKey));
  }

  static async checkAccess(featureKey: string, userAddress: string | null, isAdmin: boolean) {
    const rule = await this.getGatingRule(featureKey);
    
    if (!rule || !rule.enabled) {
      return { hasAccess: true, rule: null };
    }

    if (isAdmin && rule.bypassForAdmin) {
      return { hasAccess: true, rule, bypassed: true };
    }

    if (!rule.requiresNFT) {
      return { hasAccess: true, rule };
    }

    return { hasAccess: false, rule, requiresCheck: true };
  }
}
