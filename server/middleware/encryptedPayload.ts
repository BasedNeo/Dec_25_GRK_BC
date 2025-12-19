import { Request, Response, NextFunction } from 'express';
import { EncryptionService } from '../lib/encryption';

export interface EncryptedRequest extends Request {
  encryptedPayload?: boolean;
}

export function encryptSensitiveResponse(req: EncryptedRequest, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    if (req.headers['x-encrypt-response'] === 'true') {
      const encrypted = EncryptionService.encrypt(JSON.stringify(body));
      
      res.setHeader('X-Encrypted-Response', 'true');
      
      return originalJson({ encrypted });
    }
    
    return originalJson(body);
  };
  
  next();
}

export function decryptSensitiveRequest(req: EncryptedRequest, res: Response, next: NextFunction) {
  if (req.headers['x-encrypted-payload'] === 'true' && req.body.encrypted) {
    try {
      const decrypted = EncryptionService.decrypt(req.body.encrypted);
      req.body = JSON.parse(decrypted);
      req.encryptedPayload = true;
      
      console.log('[ENCRYPTION] Decrypted request payload');
    } catch (error) {
      console.error('[ENCRYPTION] Failed to decrypt payload:', error);
      return res.status(400).json({ error: 'Failed to decrypt payload' });
    }
  }
  
  next();
}
