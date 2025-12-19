import { Response } from 'express';

interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
}

export class SecureCookie {
  static setSecure(
    res: Response,
    name: string,
    value: string,
    options: CookieOptions = {}
  ) {
    const defaultOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    res.cookie(name, value, finalOptions);
  }
  
  static setSession(res: Response, sessionId: string) {
    this.setSecure(res, 'sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
  }
  
  static clearSession(res: Response) {
    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }
  
  static setCSRFToken(res: Response, token: string) {
    this.setSecure(res, 'csrfToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    });
  }
}
