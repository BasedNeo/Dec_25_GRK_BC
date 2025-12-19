interface Nonce {
  value: string;
  walletAddress: string;
  createdAt: number;
  used: boolean;
}

export class NonceManager {
  private static nonces: Map<string, Nonce> = new Map();
  private static readonly NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  
  static createNonce(walletAddress: string): string {
    const value = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    const nonce: Nonce = {
      value,
      walletAddress: walletAddress.toLowerCase(),
      createdAt: Date.now(),
      used: false
    };
    
    this.nonces.set(value, nonce);
    
    this.cleanupExpiredNonces();
    
    return value;
  }
  
  static validateNonce(value: string, walletAddress: string): boolean {
    const nonce = this.nonces.get(value);
    
    if (!nonce) {
      console.warn(`[AUTH] Nonce not found: ${value}`);
      return false;
    }
    
    if (nonce.used) {
      console.warn(`[AUTH] Nonce already used: ${value}`);
      return false;
    }
    
    if (nonce.walletAddress !== walletAddress.toLowerCase()) {
      console.warn(`[AUTH] Nonce wallet mismatch: expected ${nonce.walletAddress}, got ${walletAddress}`);
      return false;
    }
    
    const age = Date.now() - nonce.createdAt;
    if (age > this.NONCE_EXPIRY) {
      console.warn(`[AUTH] Nonce expired: ${value} (age: ${age}ms)`);
      this.nonces.delete(value);
      return false;
    }
    
    nonce.used = true;
    
    setTimeout(() => {
      this.nonces.delete(value);
    }, 60000);
    
    return true;
  }
  
  static cleanupExpiredNonces(): void {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(this.nonces.entries());
    for (const [value, nonce] of entries) {
      if (now - nonce.createdAt > this.NONCE_EXPIRY || nonce.used) {
        this.nonces.delete(value);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[AUTH] Cleaned up ${cleaned} expired nonces`);
    }
  }
  
  static getStats() {
    const now = Date.now();
    const active = Array.from(this.nonces.values()).filter(
      n => !n.used && now - n.createdAt <= this.NONCE_EXPIRY
    );
    
    return {
      total: this.nonces.size,
      active: active.length,
      used: this.nonces.size - active.length
    };
  }
}

setInterval(() => {
  NonceManager.cleanupExpiredNonces();
}, 60 * 1000);
