import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useGameScoresLocal } from '@/hooks/useGameScoresLocal';
import { useGameAccess } from '@/hooks/useGameAccess';
import { trackEvent } from '@/lib/analytics';
import { getGameConfig } from '@/lib/gameRegistry';
import { GameStorageManager } from '@/lib/gameStorage';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { isMobile, haptic } from '@/lib/mobileUtils';
import {
  Play, Shield, Info, Volume2, VolumeX,
  Home, Loader2, Trophy, Zap, Heart, Flame, Target, Clock, Pause
} from 'lucide-react';

interface Ring {
  radius: number;
  shrinkSpeed: number;
  gapAngle: number;
  gapSize: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

interface GameState {
  phase: GamePhase;
  score: number;
  level: number;
  lives: number;
  maxLives: number;
  combo: number;
  maxCombo: number;
  escapes: number;
  perfectEscapes: number;
  survivalTime: number;
  rings: Ring[];
  particles: Particle[];
  screenShake: number;
  lastEscapeTime: number;
}

const GAME_CONFIG = getGameConfig('cyber-breach');

const COLORS = {
  primary: '#00ffff',
  secondary: '#bf00ff',
  success: '#00ff88',
  danger: '#ff0040',
  warning: '#ffaa00',
  ring1: '#00ffff',
  ring2: '#bf00ff',
  ring3: '#00ff88',
  ring4: '#ff6b6b',
  ring5: '#ffd93d',
};

const RING_COLORS = ['#00ffff', '#bf00ff', '#00ff88', '#ff6b6b', '#ffd93d', '#48dbfb', '#ff9ff3', '#1dd1a1'];

function createRing(level: number, index: number, canvasSize: number): Ring {
  const baseRadius = canvasSize * 0.45;
  const baseShrinkSpeed = 30 + level * 5;
  const baseGapSize = Math.max(50 - level * 3, 20);
  const baseRotationSpeed = (0.3 + level * 0.08) * (index % 2 === 0 ? 1 : -1);
  
  return {
    radius: baseRadius + (index * 50),
    shrinkSpeed: baseShrinkSpeed + Math.random() * 10,
    gapAngle: Math.random() * Math.PI * 2,
    gapSize: baseGapSize + Math.random() * 15,
    rotationSpeed: baseRotationSpeed * (0.8 + Math.random() * 0.4),
    color: RING_COLORS[index % RING_COLORS.length],
    opacity: 1,
  };
}

function createParticles(x: number, y: number, color: string, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 4,
      life: 1,
    });
  }
  return particles;
}

function isInGap(ring: Ring, targetAngle: number): boolean {
  const gapStart = ring.gapAngle - (ring.gapSize * Math.PI / 180) / 2;
  const gapEnd = ring.gapAngle + (ring.gapSize * Math.PI / 180) / 2;
  
  let normalizedTarget = targetAngle;
  while (normalizedTarget < 0) normalizedTarget += Math.PI * 2;
  while (normalizedTarget >= Math.PI * 2) normalizedTarget -= Math.PI * 2;
  
  let normalizedStart = gapStart;
  let normalizedEnd = gapEnd;
  while (normalizedStart < 0) normalizedStart += Math.PI * 2;
  while (normalizedEnd < 0) normalizedEnd += Math.PI * 2;
  
  if (normalizedStart <= normalizedEnd) {
    return normalizedTarget >= normalizedStart && normalizedTarget <= normalizedEnd;
  } else {
    return normalizedTarget >= normalizedStart || normalizedTarget <= normalizedEnd;
  }
}

export default function CyberBreach() {
  const [, setLocation] = useLocation();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  const { submitScore, myStats, refreshStats } = useGameScoresLocal();
  const { access, recordPlay, isHolder, isLoading: accessLoading } = useGameAccess();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>({
    phase: 'menu',
    score: 0,
    level: 1,
    lives: 3,
    maxLives: 5,
    combo: 0,
    maxCombo: 0,
    escapes: 0,
    perfectEscapes: 0,
    survivalTime: 0,
    rings: [],
    particles: [],
    screenShake: 0,
    lastEscapeTime: 0,
  });
  
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasSizeRef = useRef<number>(400);
  const renderRef = useRef<() => void>(() => {});
  const renderMenuRef = useRef<() => void>(() => {});
  
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const highScore = myStats.bestScore;
  const playsToday = GAME_CONFIG.maxPlaysPerDay - access.playsRemaining;
  
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);
  
  const playSound = useCallback((type: 'escape' | 'perfect' | 'hit' | 'levelup' | 'gameover') => {
    if (!soundEnabled) return;
    
    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      switch (type) {
        case 'perfect':
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          break;
        case 'escape':
          osc.frequency.value = 660;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          break;
        case 'hit':
          osc.frequency.value = 120;
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          break;
        case 'levelup':
          osc.frequency.setValueAtTime(523, ctx.currentTime);
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          break;
        case 'gameover':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          break;
      }
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.debug('[CyberBreach] Audio error:', e);
    }
  }, [soundEnabled, initAudio]);
  
  const syncState = useCallback(() => {
    const state = gameStateRef.current;
    setScore(state.score);
    setLevel(state.level);
    setLives(state.lives);
    setCombo(state.combo);
    setSurvivalTime(Math.floor(state.survivalTime));
  }, []);
  
  const spawnRing = useCallback(() => {
    const state = gameStateRef.current;
    const canvasSize = canvasSizeRef.current;
    const newRing = createRing(state.level, state.rings.length, canvasSize);
    state.rings.push(newRing);
  }, []);
  
  const handleEscape = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase !== 'playing') return;
    
    const canvasSize = canvasSizeRef.current;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const coreRadius = 35;
    
    const dangerRings = state.rings.filter(r => r.radius <= coreRadius + 50 && r.radius > coreRadius);
    
    if (dangerRings.length === 0) {
      return;
    }
    
    const targetAngle = Math.PI / 2;
    let allClear = true;
    let perfectEscape = true;
    
    for (const ring of dangerRings) {
      if (!isInGap(ring, targetAngle)) {
        allClear = false;
        break;
      }
      const gapCenter = ring.gapAngle;
      const distance = Math.abs(((targetAngle - gapCenter + Math.PI) % (Math.PI * 2)) - Math.PI);
      if (distance > (ring.gapSize * Math.PI / 180) / 4) {
        perfectEscape = false;
      }
    }
    
    if (allClear) {
      state.rings = state.rings.filter(r => !dangerRings.includes(r));
      
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.escapes++;
      
      let points = 100;
      if (perfectEscape) {
        points = 250;
        state.perfectEscapes++;
        playSound('perfect');
        state.particles.push(...createParticles(centerX, centerY, COLORS.success, 25));
      } else {
        playSound('escape');
        state.particles.push(...createParticles(centerX, centerY, COLORS.primary, 15));
      }
      
      const comboMultiplier = Math.min(1 + state.combo * 0.1, 3);
      state.score += Math.floor(points * comboMultiplier);
      
      if (state.escapes % 10 === 0) {
        state.level++;
        state.score += 500 * state.level;
        playSound('levelup');
        
        if (state.lives < state.maxLives) {
          state.lives++;
        }
      }
      
      state.lastEscapeTime = Date.now();
      
      if (isMobile) haptic.light();
    } else {
      state.combo = 0;
      state.lives--;
      state.screenShake = 15;
      
      playSound('hit');
      state.particles.push(...createParticles(centerX, centerY, COLORS.danger, 20));
      
      if (isMobile) haptic.heavy();
      
      if (state.lives <= 0) {
        state.phase = 'gameover';
        setGamePhase('gameover');
        playSound('gameover');
        
        const today = new Date().toDateString();
        const playerAddress = address || 'anonymous';
        const dailyData = GameStorageManager.getDailyData('cyber-breach', playerAddress, today);
        GameStorageManager.updateDailyData('cyber-breach', playerAddress, today, {
          gamesPlayed: dailyData.gamesPlayed + 1,
          pointsEarned: dailyData.pointsEarned + state.score
        });
        
        if (state.score > 0) {
          submitScore(state.score, state.level);
          recordPlay();
          refreshStats();
          
          trackEvent('game_complete', 'cyber-breach', String(state.level), state.score);
        }
      }
    }
    
    syncState();
  }, [address, playSound, submitScore, recordPlay, refreshStats, syncState]);
  
  const gameLoop = useCallback((timestamp: number) => {
    const state = gameStateRef.current;
    
    if (state.phase !== 'playing') {
      if (state.phase === 'menu' || state.phase === 'paused') {
        renderMenuRef.current();
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    const deltaTime = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.1) : 0.016;
    lastTimeRef.current = timestamp;
    
    state.survivalTime += deltaTime;
    
    const canvasSize = canvasSizeRef.current;
    const coreRadius = 35;
    
    for (const ring of state.rings) {
      ring.gapAngle += ring.rotationSpeed * deltaTime;
      ring.radius -= ring.shrinkSpeed * deltaTime;
      
      if (ring.radius < coreRadius + 20) {
        ring.opacity = Math.max(0, (ring.radius - coreRadius) / 20);
      }
    }
    
    const hitRings = state.rings.filter(r => r.radius <= coreRadius);
    if (hitRings.length > 0) {
      const centerX = canvasSize / 2;
      const centerY = canvasSize / 2;
      
      state.rings = state.rings.filter(r => r.radius > coreRadius);
      state.combo = 0;
      state.lives--;
      state.screenShake = 15;
      
      playSound('hit');
      state.particles.push(...createParticles(centerX, centerY, COLORS.danger, 20));
      
      if (isMobile) haptic.heavy();
      
      if (state.lives <= 0) {
        state.phase = 'gameover';
        setGamePhase('gameover');
        playSound('gameover');
        
        const today = new Date().toDateString();
        const playerAddress = address || 'anonymous';
        const dailyData = GameStorageManager.getDailyData('cyber-breach', playerAddress, today);
        GameStorageManager.updateDailyData('cyber-breach', playerAddress, today, {
          gamesPlayed: dailyData.gamesPlayed + 1,
          pointsEarned: dailyData.pointsEarned + state.score
        });
        
        if (state.score > 0) {
          submitScore(state.score, state.level);
          recordPlay();
          refreshStats();
          
          trackEvent('game_complete', 'cyber-breach', String(state.level), state.score);
        }
      }
      
      syncState();
    }
    
    const spawnInterval = Math.max(1.5 - state.level * 0.1, 0.6);
    const maxRings = Math.min(3 + Math.floor(state.level / 2), 8);
    
    if (state.rings.length < maxRings) {
      const lastRing = state.rings[state.rings.length - 1];
      const outerEdge = lastRing ? lastRing.radius : 0;
      
      if (!lastRing || outerEdge < canvasSize * 0.4) {
        spawnRing();
      }
    }
    
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= deltaTime * 2;
      return p.life > 0;
    });
    
    if (state.screenShake > 0) {
      state.screenShake *= 0.9;
      if (state.screenShake < 0.1) state.screenShake = 0;
    }
    
    renderRef.current();
    
    if (state.survivalTime - Math.floor(state.survivalTime - deltaTime) >= 1) {
      syncState();
    }
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [address, playSound, spawnRing, syncState, submitScore, recordPlay, refreshStats]);
  
  const renderMenu = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const size = canvasSizeRef.current;
    const centerX = size / 2;
    const centerY = size / 2;
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
    gradient.addColorStop(0, 'rgba(0, 30, 50, 1)');
    gradient.addColorStop(0.5, 'rgba(10, 0, 40, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    const time = Date.now() / 1000;
    for (let i = 0; i < 4; i++) {
      const radius = 60 + i * 50;
      const gapAngle = time * (0.3 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      const gapSize = 45;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, gapAngle + (gapSize * Math.PI / 180), gapAngle + Math.PI * 2 - (gapSize * Math.PI / 180));
      ctx.strokeStyle = RING_COLORS[i];
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    const coreRadius = 35;
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    coreGradient.addColorStop(0, COLORS.primary);
    coreGradient.addColorStop(0.7, COLORS.secondary);
    coreGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.shadowColor = COLORS.primary;
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    
    ctx.restore();
  }, []);
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = gameStateRef.current;
    const dpr = window.devicePixelRatio || 1;
    const size = canvasSizeRef.current;
    const centerX = size / 2;
    const centerY = size / 2;
    
    ctx.save();
    ctx.scale(dpr, dpr);
    
    if (state.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.screenShake;
      const shakeY = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(shakeX, shakeY);
    }
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
    gradient.addColorStop(0, 'rgba(0, 30, 50, 1)');
    gradient.addColorStop(0.5, 'rgba(10, 0, 40, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < size; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    
    for (const ring of state.rings) {
      if (ring.opacity <= 0) continue;
      
      const gapStart = ring.gapAngle - (ring.gapSize * Math.PI / 180) / 2;
      const gapEnd = ring.gapAngle + (ring.gapSize * Math.PI / 180) / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring.radius, gapEnd, gapStart + Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.globalAlpha = ring.opacity;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      
      const gapCenterX = centerX + Math.cos(ring.gapAngle) * ring.radius;
      const gapCenterY = centerY + Math.sin(ring.gapAngle) * ring.radius;
      
      ctx.beginPath();
      ctx.arc(gapCenterX, gapCenterY, 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.success;
      ctx.globalAlpha = ring.opacity;
      ctx.shadowColor = COLORS.success;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    
    const targetAngle = Math.PI / 2;
    const lineLength = 50;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 35);
    ctx.lineTo(centerX, centerY + 35 + lineLength);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const coreRadius = 35;
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    coreGradient.addColorStop(0, COLORS.primary);
    coreGradient.addColorStop(0.7, COLORS.secondary);
    coreGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.shadowColor = COLORS.primary;
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    
    ctx.font = 'bold 22px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(String(state.level), centerX, centerY);
    
    for (const particle of state.particles) {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    ctx.restore();
  }, []);
  
  renderRef.current = render;
  renderMenuRef.current = renderMenu;
  
  const startGame = useCallback(() => {
    if (!access.canPlay) {
      toast({
        title: "Daily Limit Reached",
        description: access.reason || "Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }
    
    const playerAddress = address || 'anonymous';
    const dailyLimits = GameStorageManager.checkDailyLimits('cyber-breach', playerAddress, 10, 50000);
    if (!dailyLimits.canPlay) {
      toast({
        title: "Daily Limit Reached",
        description: dailyLimits.reason || "Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }
    
    const canvasSize = canvasSizeRef.current;
    
    gameStateRef.current = {
      phase: 'playing',
      score: 0,
      level: 1,
      lives: 3,
      maxLives: 5,
      combo: 0,
      maxCombo: 0,
      escapes: 0,
      perfectEscapes: 0,
      survivalTime: 0,
      rings: [],
      particles: [],
      screenShake: 0,
      lastEscapeTime: 0,
    };
    
    spawnRing();
    
    setGamePhase('playing');
    syncState();
    
    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    trackEvent('game_started', 'cyber-breach', 'start', 0);
    
    if (isMobile) haptic.light();
  }, [address, access.canPlay, access.reason, toast, spawnRing, syncState, gameLoop]);
  
  const pauseGame = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === 'playing') {
      state.phase = 'paused';
      setGamePhase('paused');
    }
  }, []);
  
  const resumeGame = useCallback(() => {
    const state = gameStateRef.current;
    if (state.phase === 'paused') {
      state.phase = 'playing';
      setGamePhase('playing');
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameLoop]);
  
  const exitToArcade = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    setLocation('/games');
  }, [setLocation]);
  
  useEffect(() => {
    if (address) {
      refreshStats();
    }
  }, [address, refreshStats]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const getGameDimensions = () => {
      // Calculate based on viewport, accounting for all UI chrome
      const navbarHeight = 80;
      const statsBarHeight = 50;
      const headerBarHeight = 50;
      const instructionHeight = 40;
      const padding = 48;
      
      // Available space in viewport
      const availableWidth = window.innerWidth - padding;
      const availableHeight = window.innerHeight - navbarHeight - statsBarHeight - headerBarHeight - instructionHeight - padding;
      
      // Square aspect ratio - use smaller dimension
      let size = Math.min(availableWidth, availableHeight);
      
      // Clamp to reasonable bounds
      const minSize = 250;
      const maxSize = 500; // Cap at 500px for good gameplay
      
      size = Math.max(minSize, Math.min(size, maxSize));
      
      return Math.floor(size);
    };
    
    const resizeCanvas = () => {
      const size = getGameDimensions();
      canvasSizeRef.current = size;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      
      if (gameStateRef.current.phase === 'menu') {
        renderMenuRef.current();
      } else {
        renderRef.current();
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 100));
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameLoop]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameStateRef.current.phase === 'playing') {
          handleEscape();
        } else if (gameStateRef.current.phase === 'menu') {
          startGame();
        } else if (gameStateRef.current.phase === 'paused') {
          resumeGame();
        }
      } else if (e.code === 'Escape') {
        if (gameStateRef.current.phase === 'playing') {
          pauseGame();
        } else if (gameStateRef.current.phase === 'paused') {
          resumeGame();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEscape, startGame, pauseGame, resumeGame]);
  
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }
  
  if (!isHolder && GAME_CONFIG.nftRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto bg-black/40 border border-cyan-500/20 p-8 text-center">
            <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-orbitron font-bold text-white mb-4">Guardian Access Required</h2>
            <p className="text-gray-400 mb-6">
              You need to own a Based Guardian NFT to access Cyber Breach.
            </p>
            <Button
              onClick={() => setLocation('/marketplace')}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
              data-testid="button-get-guardian"
            >
              Get a Guardian
            </Button>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen max-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 overflow-hidden flex flex-col">
      <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
      
      <div className="flex-1 container mx-auto px-4 py-2 flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={exitToArcade}
            className="text-gray-400 hover:text-white"
            data-testid="button-back-arcade"
          >
            <Home className="w-4 h-4 mr-2" />
            Arcade
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-gray-400 hover:text-white"
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTutorial(true)}
              className="text-gray-400 hover:text-white"
              data-testid="button-show-tutorial"
            >
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
          {gamePhase === 'playing' ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between bg-black/40 rounded-lg px-4 py-2 border border-cyan-500/20 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-white font-bold">{score.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-gray-300">{survivalTime}s</span>
                  </div>
                  {combo > 1 && (
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-400 animate-pulse">{combo}x</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: lives }).map((_, i) => (
                      <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />
                    ))}
                    {Array.from({ length: 3 - lives }).map((_, i) => (
                      <Heart key={i} className="w-4 h-4 text-gray-600" />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={pauseGame}
                    className="text-gray-400 hover:text-white h-8 w-8"
                    data-testid="button-pause"
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div 
                ref={containerRef}
                className="bg-black/40 border border-cyan-500/20 rounded-xl p-2 cursor-pointer touch-none select-none flex flex-col items-center justify-center"
                onClick={handleEscape}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleEscape();
                }}
                data-testid="game-canvas-container"
              >
                <canvas
                  ref={canvasRef}
                  className="rounded-lg block"
                  data-testid="game-canvas"
                />
                <p className="text-center text-gray-500 text-xs mt-1">
                  Tap when gaps align at bottom
                </p>
              </div>
            </div>
          ) : gamePhase === 'paused' ? (
            <Card className="bg-black/40 border border-cyan-500/20 p-8 text-center">
              <h2 className="text-3xl font-orbitron font-bold text-white mb-6">PAUSED</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                  <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{score.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                  <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{survivalTime}s</p>
                  <p className="text-xs text-gray-500">Survived</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={resumeGame}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  data-testid="button-resume"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
                
                <Button
                  variant="outline"
                  onClick={exitToArcade}
                  className="w-full border-white/20"
                  data-testid="button-quit-arcade"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Quit to Arcade
                </Button>
              </div>
            </Card>
          ) : gamePhase === 'gameover' ? (
            <VictoryScreen
              gameType="cyber-breach"
              score={score}
              time={survivalTime}
              extraStats={[
                { icon: Target, label: 'Escapes', value: gameStateRef.current.escapes, color: 'text-cyan-400' },
                { icon: Zap, label: 'Perfect', value: gameStateRef.current.perfectEscapes, color: 'text-green-400' },
                { icon: Flame, label: 'Max Combo', value: gameStateRef.current.maxCombo, color: 'text-orange-400' },
              ]}
              playsRemaining={Math.max(0, GAME_CONFIG.maxPlaysPerDay - playsToday - 1)}
              maxPlays={GAME_CONFIG.maxPlaysPerDay}
              isNewBest={score > 0 && score >= highScore}
              personalBest={highScore}
              onPlayAgain={startGame}
              onExit={exitToArcade}
            />
          ) : (
            <div ref={containerRef}>
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl">
                <div className="flex items-center justify-center p-4">
                  <canvas
                    ref={canvasRef}
                    className="rounded-lg"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    data-testid="menu-canvas"
                  />
                </div>
                
                <div className="p-6 pt-0">
                  <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-white text-center mb-2">
                    CYBER BREACH
                  </h1>
                  <p className="text-gray-400 text-center text-sm mb-6">
                    Escape closing FUD security rings. Tap to phase through gaps.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                      <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                      <p className="text-xl font-bold text-white text-center">{highScore.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 text-center">Best Score</p>
                    </div>
                    
                    <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                      <Play className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                      <p className="text-xl font-bold text-white text-center">{playsToday}/{GAME_CONFIG.maxPlaysPerDay}</p>
                      <p className="text-xs text-gray-500 text-center">Plays Today</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={startGame}
                    disabled={!access.canPlay}
                    className="w-full bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-600 hover:to-green-600 text-black font-bold text-lg py-6"
                    data-testid="button-start-game"
                  >
                    {access.canPlay ? (
                      <>
                        <Play className="w-6 h-6 mr-2" />
                        START BREACH
                      </>
                    ) : (
                      'Daily Limit Reached'
                    )}
                  </Button>
                  
                  <p className="text-gray-500 text-xs text-center mt-4">
                    Press SPACE or tap screen to escape through gaps
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTutorial(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-cyan-500/30 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-orbitron font-bold text-white mb-4 text-center">
                HOW TO PLAY
              </h3>
              
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p>FUD security rings close in on your core. Each ring has a gap you can escape through.</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-green-400" />
                  </div>
                  <p>Tap or press SPACE when the gap aligns with the bottom target line to escape.</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <p>Chain perfect escapes to build combos and multiply your score up to 3x!</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-red-400" />
                  </div>
                  <p>You have 3 lives. If a ring hits your core or you miss-time an escape, you lose a life.</p>
                </div>
              </div>
              
              <Button
                onClick={() => setShowTutorial(false)}
                className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-purple-500"
                data-testid="button-close-tutorial"
              >
                GOT IT!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
