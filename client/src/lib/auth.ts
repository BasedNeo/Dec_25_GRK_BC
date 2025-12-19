import { useAccount, useSignMessage } from 'wagmi';
import { useState, useEffect, useCallback } from 'react';

export class AuthManager {
  private static sessionId: string | null = null;
  
  static setSession(sessionId: string) {
    this.sessionId = sessionId;
    localStorage.setItem('sessionId', sessionId);
  }
  
  static getSession(): string | null {
    if (!this.sessionId) {
      this.sessionId = localStorage.getItem('sessionId');
    }
    return this.sessionId;
  }
  
  static clearSession() {
    this.sessionId = null;
    localStorage.removeItem('sessionId');
  }
  
  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const sessionId = this.getSession();
    
    if (!sessionId) {
      throw new Error('No active session');
    }
    
    const method = options.method?.toUpperCase() || 'GET';
    const needsCsrf = method === 'POST' || method === 'PUT' || method === 'DELETE';
    
    let csrfToken = localStorage.getItem('csrfToken');
    
    if (!csrfToken && needsCsrf) {
      try {
        const csrfRes = await fetch('/api/auth/csrf-token', {
          headers: { 'X-Session-ID': sessionId }
        });
        if (csrfRes.ok) {
          const csrfData = await csrfRes.json();
          csrfToken = csrfData.csrfToken;
          if (csrfToken) {
            localStorage.setItem('csrfToken', csrfToken);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch CSRF token:', err);
      }
    }
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      'X-Session-ID': sessionId
    };
    
    if (csrfToken && needsCsrf) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      this.clearSession();
      localStorage.removeItem('csrfToken');
      throw new Error('Session expired');
    }
    
    if (response.status === 403) {
      try {
        const data = await response.clone().json();
        if (data.code === 'INVALID_CSRF_TOKEN') {
          localStorage.removeItem('csrfToken');
          throw new Error('CSRF token invalid, please try again');
        }
      } catch (e) {
      }
    }
    
    return response;
  }
  
  static clearCsrfToken() {
    localStorage.removeItem('csrfToken');
  }
}

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const sessionId = AuthManager.getSession();
    setIsAuthenticated(!!sessionId && isConnected);
    
    if (!isConnected) {
      AuthManager.clearSession();
      setIsAuthenticated(false);
    }
  }, [isConnected]);
  
  const authenticate = useCallback(async (): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      if (!nonceRes.ok) {
        throw new Error('Failed to get authentication nonce');
      }
      
      const { nonce, message } = await nonceRes.json();
      
      const signature = await signMessageAsync({ message });
      
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          message,
          nonce
        })
      });
      
      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      const { sessionId } = await verifyRes.json();
      
      AuthManager.setSession(sessionId);
      setIsAuthenticated(true);
      
      return sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('Authentication failed:', err);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, signMessageAsync]);
  
  const logout = useCallback(async (): Promise<void> => {
    try {
      await AuthManager.authenticatedFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      AuthManager.clearSession();
      setIsAuthenticated(false);
    }
  }, []);
  
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await AuthManager.authenticatedFetch('/api/auth/refresh', {
        method: 'POST'
      });
      
      if (response.ok) {
        const { sessionId } = await response.json();
        AuthManager.setSession(sessionId);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Session refresh failed:', err);
      return false;
    }
  }, []);
  
  const getSessions = useCallback(async (): Promise<any[]> => {
    try {
      const response = await AuthManager.authenticatedFetch('/api/auth/sessions');
      if (response.ok) {
        const data = await response.json();
        return data.sessions || [];
      }
      return [];
    } catch (err) {
      console.error('Failed to get sessions:', err);
      return [];
    }
  }, []);
  
  return {
    isAuthenticated,
    isAuthenticating,
    error,
    authenticate,
    logout,
    refreshSession,
    getSessions
  };
}
