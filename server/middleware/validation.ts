import { Request, Response, NextFunction } from 'express';
import { InputSanitizer } from '../lib/sanitizer';

export function validateCustomName(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body.customName) {
      return res.status(400).json({ error: 'Custom name is required' });
    }
    
    req.body.customName = InputSanitizer.sanitizeCustomName(req.body.customName);
    next();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export function validateProposal(req: Request, res: Response, next: NextFunction) {
  try {
    const sanitized = InputSanitizer.validateAndSanitizeRequest(req.body, {
      title: { type: 'string', required: true, maxLength: 100 },
      description: { type: 'string', required: true, maxLength: 2000 },
      category: { type: 'string', required: true, maxLength: 50 },
      durationDays: { type: 'number', required: false, min: 1, max: 30 }
    });
    
    req.body = { ...req.body, ...sanitized };
    next();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export function validateListing(req: Request, res: Response, next: NextFunction) {
  try {
    const sanitized = InputSanitizer.validateAndSanitizeRequest(req.body, {
      tokenId: { type: 'tokenId', required: true },
      price: { type: 'string', required: true, maxLength: 50 }
    });
    
    req.body = { ...req.body, ...sanitized };
    next();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export function validateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const sanitized = InputSanitizer.validateAndSanitizeRequest(req.body, {
      tokenId: { type: 'tokenId', required: true },
      price: { type: 'string', required: true, maxLength: 50 },
      expiresAt: { type: 'number', required: true }
    });
    
    req.body = { ...req.body, ...sanitized };
    next();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export function validateWalletAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const walletAddress = req.params.walletAddress || req.body.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const sanitized = InputSanitizer.sanitizeWalletAddress(walletAddress);
    
    if (req.params.walletAddress) {
      req.params.walletAddress = sanitized;
    }
    if (req.body.walletAddress) {
      req.body.walletAddress = sanitized;
    }
    
    next();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export function sanitizeQueryParams(req: Request, res: Response, next: NextFunction) {
  try {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = InputSanitizer.sanitizeString(value, { stripHtml: true, maxLength: 200 });
      }
    }
    next();
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid query parameters' });
  }
}
