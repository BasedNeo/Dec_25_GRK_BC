import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  
  private static masterKey: Buffer;
  
  static initialize() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      console.warn('[ENCRYPTION] No ENCRYPTION_KEY found, generating temporary key');
      this.masterKey = crypto.randomBytes(this.KEY_LENGTH);
    } else {
      this.masterKey = crypto.scryptSync(key, 'salt', this.KEY_LENGTH);
    }
  }
  
  static encrypt(data: string | object): string {
    if (!this.masterKey) {
      this.initialize();
    }
    
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const result = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
    
    return result;
  }
  
  static decrypt(encryptedData: string): string {
    if (!this.masterKey) {
      this.initialize();
    }
    
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const iv = buffer.slice(0, this.IV_LENGTH);
    const authTag = buffer.slice(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
    const encrypted = buffer.slice(this.IV_LENGTH + this.AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  static encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }
  
  static decryptObject<T>(encryptedData: string): T {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted) as T;
  }
  
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  static hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt || crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(data, useSalt, 100000, 64, 'sha512').toString('hex');
    
    return { hash, salt: useSalt };
  }
  
  static verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashWithSalt(data, salt);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  }
  
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    return { publicKey, privateKey };
  }
  
  static encryptWithPublicKey(data: string, publicKey: string): string {
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(data, 'utf8')
    );
    
    return encrypted.toString('base64');
  }
  
  static decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedData, 'base64')
    );
    
    return decrypted.toString('utf8');
  }
  
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  static hmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
  
  static verifyHmac(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.hmac(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}

EncryptionService.initialize();
