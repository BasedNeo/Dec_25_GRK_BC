import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req: Request) => req.path === '/api/health' || req.path === '/_health',
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded limit on ${req.path}`);
    res.status(429).json({ 
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60 / 60)
    });
  },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many write requests' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded write limit on ${req.path}`);
    res.status(429).json({ 
      error: 'Too many write operations, please slow down',
      retryAfter: 60
    });
  },
});

// Helper to normalize IPv6 addresses for consistent rate limiting
const normalizeIp = (ip: string | undefined): string => {
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':');
  }
  return ip;
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts' },
  keyGenerator: (req: Request) => {
    const wallet = req.body?.walletAddress || req.query?.walletAddress || '';
    const ip = normalizeIp(req.ip);
    return `${ip}-${wallet}`;
  },
  validate: { keyGeneratorIpFallback: false },
});

export const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many game submissions' },
  validate: { xForwardedForHeader: false },
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] IP ${req.ip} game spam on ${req.path}`);
    res.status(429).json({ 
      error: 'Please wait before submitting another score',
      retryAfter: 60
    });
  },
});
