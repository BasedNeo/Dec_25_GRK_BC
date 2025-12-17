import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
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
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded write limit on ${req.path}`);
    res.status(429).json({ 
      error: 'Too many write operations, please slow down',
      retryAfter: 60
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts' },
  keyGenerator: (req: Request) => {
    const wallet = req.body?.walletAddress || req.query?.walletAddress || '';
    let ip = req.ip || 'unknown';
    if (ip.startsWith('::ffff:')) {
      ip = ip.slice(7);
    } else if (ip.includes(':')) {
      ip = ip.split(':').slice(0, 4).join(':');
    }
    return `${ip}-${wallet}`;
  },
  validate: { ip: false },
});

export const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many game submissions' },
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] IP ${req.ip} game spam on ${req.path}`);
    res.status(429).json({ 
      error: 'Please wait before submitting another score',
      retryAfter: 60
    });
  },
});
