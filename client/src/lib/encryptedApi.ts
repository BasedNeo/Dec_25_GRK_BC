export class EncryptedApiClient {
  private static encryptionKey: CryptoKey | null = null;
  
  static async initialize() {
    if (this.encryptionKey) return;
    
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('your-encryption-key'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    this.encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  static async encrypt(data: any): Promise<string> {
    await this.initialize();
    
    const plaintext = JSON.stringify(data);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      new TextEncoder().encode(plaintext)
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  }
  
  static async decrypt(encryptedData: string): Promise<any> {
    await this.initialize();
    
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      data
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
  
  static async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const shouldEncrypt = options.method !== 'GET' && options.method !== 'HEAD';
    
    if (shouldEncrypt && options.body) {
      const body = typeof options.body === 'string' 
        ? JSON.parse(options.body) 
        : options.body;
      
      const encrypted = await this.encrypt(body);
      
      options.body = JSON.stringify({ encrypted });
      options.headers = {
        ...options.headers,
        'X-Encrypted-Payload': 'true',
        'X-Encrypt-Response': 'true'
      };
    }
    
    const response = await fetch(url, options);
    
    if (response.headers.get('X-Encrypted-Response') === 'true') {
      const encryptedBody = await response.json();
      const decrypted = await this.decrypt(encryptedBody.encrypted);
      
      return new Response(JSON.stringify(decrypted), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    
    return response;
  }
}
