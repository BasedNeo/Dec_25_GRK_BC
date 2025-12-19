import { ValidationRule } from './validationRules';

export const ValidationSchemas = {
  customName: {
    tokenId: {
      type: 'tokenId' as const,
      required: true,
      errorMessage: 'Valid token ID required'
    },
    customName: {
      type: 'string' as const,
      required: true,
      minLength: 3,
      maxLength: 32,
      pattern: /^[a-zA-Z0-9_\s-]+$/,
      errorMessage: 'Name must be 3-32 characters, alphanumeric only',
      sanitize: (v: string) => v.trim()
    }
  } as Record<string, ValidationRule>,
  
  proposal: {
    title: {
      type: 'string' as const,
      required: true,
      minLength: 10,
      maxLength: 100,
      errorMessage: 'Title must be 10-100 characters',
      sanitize: (v: string) => v.trim()
    },
    description: {
      type: 'string' as const,
      required: true,
      minLength: 50,
      maxLength: 2000,
      errorMessage: 'Description must be 50-2000 characters',
      sanitize: (v: string) => v.trim()
    },
    proposer: {
      type: 'wallet' as const,
      required: true,
      errorMessage: 'Valid proposer wallet address required'
    },
    category: {
      type: 'enum' as const,
      required: false,
      enum: ['governance', 'technical', 'community', 'treasury', 'general'],
      default: 'general',
      errorMessage: 'Invalid category'
    },
    durationDays: {
      type: 'integer' as const,
      required: true,
      min: 1,
      max: 30,
      errorMessage: 'Duration must be between 1 and 30 days'
    },
    requiredQuorum: {
      type: 'integer' as const,
      required: false,
      min: 1,
      max: 100,
      default: 10
    }
  } as Record<string, ValidationRule>,
  
  vote: {
    voter: {
      type: 'wallet' as const,
      required: true,
      errorMessage: 'Valid voter wallet address required'
    },
    vote: {
      type: 'enum' as const,
      required: true,
      enum: ['for', 'against'],
      errorMessage: "Vote must be 'for' or 'against'"
    },
    votingPower: {
      type: 'integer' as const,
      required: false,
      min: 1,
      default: 1
    }
  } as Record<string, ValidationRule>,
  
  listing: {
    tokenId: {
      type: 'tokenId' as const,
      required: true
    },
    price: {
      type: 'string' as const,
      required: true,
      pattern: /^\d+(\.\d+)?$/,
      errorMessage: 'Price must be a valid number',
      custom: (v: string) => {
        const num = parseFloat(v);
        if (num <= 0) return 'Price must be greater than 0';
        if (num > 1000000000) return 'Price too large';
        return true;
      }
    }
  } as Record<string, ValidationRule>,
  
  offer: {
    tokenId: {
      type: 'tokenId' as const,
      required: true
    },
    price: {
      type: 'string' as const,
      required: true,
      pattern: /^\d+(\.\d+)?$/,
      errorMessage: 'Price must be a valid number',
      custom: (v: string) => {
        const num = parseFloat(v);
        if (num <= 0) return 'Price must be greater than 0';
        if (num > 1000000000) return 'Price too large';
        return true;
      }
    },
    expiresAt: {
      type: 'number' as const,
      required: true,
      custom: (v: number) => {
        if (v <= Date.now()) return 'Expiration must be in the future';
        if (v > Date.now() + 30 * 24 * 60 * 60 * 1000) return 'Expiration too far in future';
        return true;
      }
    }
  } as Record<string, ValidationRule>,
  
  gameSubmit: {
    gameType: {
      type: 'enum' as const,
      required: true,
      enum: ['guardian-solitaire', 'asteroid-mining', 'guardian-defense', 'retro-defender']
    },
    score: {
      type: 'integer' as const,
      required: true,
      min: 0,
      max: 1000000
    },
    duration: {
      type: 'integer' as const,
      required: false,
      min: 0,
      max: 3600000
    },
    metadata: {
      type: 'object' as const,
      required: false
    }
  } as Record<string, ValidationRule>,
  
  banUser: {
    walletAddress: {
      type: 'wallet' as const,
      required: true
    },
    reason: {
      type: 'string' as const,
      required: true,
      minLength: 10,
      maxLength: 500
    },
    durationHours: {
      type: 'integer' as const,
      required: false,
      min: 1,
      max: 8760
    }
  } as Record<string, ValidationRule>,
  
  pagination: {
    page: {
      type: 'integer' as const,
      required: false,
      min: 1,
      default: 1
    },
    limit: {
      type: 'integer' as const,
      required: false,
      min: 1,
      max: 100,
      default: 20
    },
    sortBy: {
      type: 'string' as const,
      required: false,
      pattern: /^[a-z_]+$/,
      maxLength: 50
    },
    sortOrder: {
      type: 'enum' as const,
      required: false,
      enum: ['asc', 'desc'],
      default: 'desc'
    }
  } as Record<string, ValidationRule>
};
