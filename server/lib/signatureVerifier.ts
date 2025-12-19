import { ethers } from 'ethers';

export class SignatureVerifier {
  static verifySignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      const match = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      
      if (!match) {
        console.warn(`[AUTH] Signature mismatch: expected ${expectedAddress}, got ${recoveredAddress}`);
      }
      
      return match;
    } catch (error) {
      console.error('[AUTH] Signature verification failed:', error);
      return false;
    }
  }
  
  static generateNonce(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  
  static createSignInMessage(walletAddress: string, nonce: string): string {
    return `Sign this message to authenticate with Guardian Command.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
  }
  
  static verifyMessageAge(message: string, maxAgeMinutes: number = 5): boolean {
    const timestampMatch = message.match(/Timestamp: (.+)/);
    
    if (!timestampMatch) {
      console.warn('[AUTH] No timestamp found in message');
      return false;
    }
    
    try {
      const timestamp = new Date(timestampMatch[1]).getTime();
      const now = Date.now();
      const age = now - timestamp;
      const maxAge = maxAgeMinutes * 60 * 1000;
      
      if (age > maxAge) {
        console.warn(`[AUTH] Message too old: ${age}ms (max: ${maxAge}ms)`);
        return false;
      }
      
      if (age < 0) {
        console.warn('[AUTH] Message timestamp is in the future');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[AUTH] Failed to verify message age:', error);
      return false;
    }
  }
}
