import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export function RocketIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#8b00ff" />
        </linearGradient>
      </defs>
      <path d="M16 2L10 14L12 16V24L16 28L20 24V16L22 14L16 2Z" fill="url(#rocketGrad)" />
      <path d="M12 16L8 18L10 22L12 20V16Z" fill="#ff00ff" fillOpacity="0.8" />
      <path d="M20 16L24 18L22 22L20 20V16Z" fill="#ff00ff" fillOpacity="0.8" />
      <circle cx="16" cy="10" r="2" fill="#fff" fillOpacity="0.9" />
      <path d="M14 24L16 30L18 24" fill="#ff8800" fillOpacity="0.8" />
    </svg>
  );
}

export function TrophyIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#ff8c00" />
        </linearGradient>
      </defs>
      <path d="M8 4H24V12C24 16.4 20.4 20 16 20C11.6 20 8 16.4 8 12V4Z" fill="url(#trophyGrad)" />
      <path d="M4 4H8V10C6 9 4 7 4 4Z" fill="#ffd700" fillOpacity="0.7" />
      <path d="M28 4H24V10C26 9 28 7 28 4Z" fill="#ffd700" fillOpacity="0.7" />
      <path d="M14 20H18V24H14Z" fill="#ffd700" />
      <path d="M10 24H22V28H10Z" fill="url(#trophyGrad)" />
      <circle cx="16" cy="11" r="4" fill="#fff" fillOpacity="0.3" />
    </svg>
  );
}

export function HeartIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff0066" />
          <stop offset="100%" stopColor="#ff0000" />
        </linearGradient>
        <filter id="heartGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M16 28L4 16C1 13 1 8 4 5C7 2 12 2 16 6C20 2 25 2 28 5C31 8 31 13 28 16L16 28Z" 
            fill="url(#heartGrad)" filter="url(#heartGlow)" />
      <ellipse cx="10" cy="10" rx="3" ry="2" fill="#fff" fillOpacity="0.4" transform="rotate(-30 10 10)" />
    </svg>
  );
}

export function PlayIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00ff88" />
          <stop offset="100%" stopColor="#00ffff" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" stroke="url(#playGrad)" strokeWidth="2" fill="none" />
      <path d="M12 8L26 16L12 24V8Z" fill="url(#playGrad)" />
    </svg>
  );
}

export function RestartIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="restartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#8b00ff" />
        </linearGradient>
      </defs>
      <path d="M16 4C22.6 4 28 9.4 28 16C28 22.6 22.6 28 16 28C9.4 28 4 22.6 4 16C4 11.8 6.2 8.2 9.5 6" 
            stroke="url(#restartGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M9 2L9 10L17 6L9 2Z" fill="url(#restartGrad)" />
    </svg>
  );
}

export function ShieldIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="50%" stopColor="#8b00ff" />
          <stop offset="100%" stopColor="#ff00ff" />
        </linearGradient>
      </defs>
      <path d="M16 2L4 6V14C4 22 10 27 16 30C22 27 28 22 28 14V6L16 2Z" 
            fill="url(#shieldGrad)" fillOpacity="0.3" stroke="url(#shieldGrad)" strokeWidth="2" />
      <path d="M12 16L15 19L21 12" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ControlLeftIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#1a1a2e" stroke="#00ffff" strokeWidth="2" />
      <path d="M18 10L10 16L18 22" stroke="#00ffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ControlRightIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#1a1a2e" stroke="#00ffff" strokeWidth="2" />
      <path d="M14 10L22 16L14 22" stroke="#00ffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ControlUpIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#1a1a2e" stroke="#8b00ff" strokeWidth="2" />
      <path d="M10 20L16 10L22 20" stroke="#8b00ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FireIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <radialGradient id="fireGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff0000" />
          <stop offset="100%" stopColor="#ff00ff" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="url(#fireGrad)" fillOpacity="0.3" stroke="#ff0066" strokeWidth="2" />
      <circle cx="16" cy="16" r="6" fill="#ff0066" />
      <circle cx="16" cy="16" r="3" fill="#fff" fillOpacity="0.8" />
    </svg>
  );
}

export function GamepadIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="padGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#8b00ff" />
        </linearGradient>
      </defs>
      <rect x="2" y="8" width="28" height="16" rx="8" fill="url(#padGrad)" fillOpacity="0.3" stroke="url(#padGrad)" strokeWidth="2" />
      <circle cx="10" cy="16" r="4" stroke="#00ffff" strokeWidth="1.5" fill="none" />
      <path d="M8 16H12M10 14V18" stroke="#00ffff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="14" r="2" fill="#ff00ff" />
      <circle cx="24" cy="16" r="2" fill="#00ff88" />
      <circle cx="22" cy="18" r="2" fill="#ffff00" />
      <circle cx="18" cy="16" r="2" fill="#00ffff" />
    </svg>
  );
}

export function LoadingIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={`animate-spin ${className}`}>
      <circle cx="16" cy="16" r="12" stroke="#00ffff" strokeWidth="2" strokeOpacity="0.3" fill="none" />
      <path d="M16 4C22.6 4 28 9.4 28 16" stroke="#00ffff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function StarIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#ff8c00" />
        </linearGradient>
      </defs>
      <path d="M16 2L19.5 11.5H29L21.5 17.5L24.5 27L16 21L7.5 27L10.5 17.5L3 11.5H12.5L16 2Z" 
            fill="url(#starGrad)" />
    </svg>
  );
}

export function LevelIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="levelGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#8b00ff" />
        </linearGradient>
      </defs>
      <rect x="4" y="20" width="6" height="8" fill="url(#levelGrad)" fillOpacity="0.5" rx="1" />
      <rect x="13" y="14" width="6" height="14" fill="url(#levelGrad)" fillOpacity="0.7" rx="1" />
      <rect x="22" y="6" width="6" height="22" fill="url(#levelGrad)" rx="1" />
    </svg>
  );
}

export function ScoreIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#ff00ff" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" stroke="url(#scoreGrad)" strokeWidth="2" fill="none" />
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontFamily="monospace" fontWeight="bold" fill="url(#scoreGrad)">$</text>
    </svg>
  );
}
