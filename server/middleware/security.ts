import helmet from 'helmet';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { OriginValidator } from '../lib/originValidator';

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://mainnet.basedaibridge.com",
        "https://api.coingecko.com",
        "https://api.binance.com",
        "https://*.mypinata.cloud",
        "wss://relay.walletconnect.com",
        "wss://relay.walletconnect.org",
        "https://*.walletconnect.com",
        "https://*.walletconnect.org"
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://player.vimeo.com"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

export const corsConfig = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (OriginValidator.isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      OriginValidator.trackSuspiciousOrigin(origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Session-ID',
    'X-CSRF-Token',
    'X-Wallet-Address',
    'X-Admin-Signature',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400
});

export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  const sanitizeObj = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj as Record<string, unknown>) {
        (obj as Record<string, unknown>)[key] = sanitizeObj((obj as Record<string, unknown>)[key]);
      }
    }
    return obj;
  };
  
  if (req.body) req.body = sanitizeObj(req.body);
  if (req.query) req.query = sanitizeObj(req.query) as typeof req.query;
  if (req.params) req.params = sanitizeObj(req.params) as typeof req.params;
  
  next();
}

export function secureLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const path = req.path;
  
  const originalJson = res.json;
  res.json = function (body: unknown) {
    const safeBody = redactSensitive(body);
    
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      console.log(`${req.method} ${path} ${res.statusCode} ${duration}ms`);
      
      if (process.env.NODE_ENV === 'development' && res.statusCode >= 400) {
        console.log('  Response:', JSON.stringify(safeBody).slice(0, 200));
      }
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}

function redactSensitive(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = ['signature', 'privateKey', 'secret', 'password', 'auth', 'p256dh'];
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitive(item));
  }
  
  const result: Record<string, unknown> = {};
  
  for (const key in obj as Record<string, unknown>) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      result[key] = '[REDACTED]';
    } else if (typeof (obj as Record<string, unknown>)[key] === 'object') {
      result[key] = redactSensitive((obj as Record<string, unknown>)[key]);
    } else {
      result[key] = (obj as Record<string, unknown>)[key];
    }
  }
  
  return result;
}
