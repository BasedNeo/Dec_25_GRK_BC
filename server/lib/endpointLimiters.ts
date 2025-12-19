import { AdvancedRateLimiter } from './advancedRateLimiter';

export const EndpointLimiters = {
  mint: AdvancedRateLimiter.createLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many mint attempts. Please wait before minting again.'
  }),
  
  buy: AdvancedRateLimiter.createLimiter({
    windowMs: 30 * 1000,
    max: 10,
    message: 'Too many purchase attempts. Please wait before buying again.'
  }),
  
  list: AdvancedRateLimiter.createLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many listing operations. Please slow down.'
  }),
  
  offer: AdvancedRateLimiter.createLimiter({
    windowMs: 60 * 1000,
    max: 15,
    message: 'Too many offer operations. Please wait before making more offers.'
  }),
  
  customName: AdvancedRateLimiter.createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many custom name changes. You can change names 3 times per hour.'
  }),
  
  vote: AdvancedRateLimiter.createLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many voting attempts. Please slow down.'
  }),
  
  proposalCreate: AdvancedRateLimiter.createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many proposal creations. Maximum 3 proposals per hour.'
  }),
  
  gameSubmit: AdvancedRateLimiter.createLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many game submissions. Please play at a reasonable pace.'
  }),
  
  profileUpdate: AdvancedRateLimiter.createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: 'Too many profile updates. Please wait before updating again.'
  }),
  
  export: AdvancedRateLimiter.createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many export requests. Maximum 5 exports per 15 minutes.'
  })
};
