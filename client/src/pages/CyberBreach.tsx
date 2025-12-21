import { useState, useEffect, useCallback, useRef } from 'react';
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
import { GameHUD, HUDStat } from '@/components/game/GameHUD';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import {
  Play, Shield, Info, Volume2, VolumeX,
  Home, Loader2, Trophy, Zap, Heart, Flame, Target
} from 'lucide-react';

interface Ring {
  radius: number;
  speed: number;
  gapSize: number;
  gapPosition: number;
  direction: 1 | -1;
  color: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface PowerUp {
  type: 'slowmo' | 'shield' | 'ghost' | 'multi';
  x: number;
  y: number;
  vy: number;
  active: boolean;
  duration: number;
}

type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelComplete';

interface GameState {
  status: GameStatus;
  level: number;
  breachesCompleted: number;
  breachesRequired: number;
  score: number;
  shields: number;
  maxShields: number;
  combo: number;
  maxCombo: number;
  perfectBreaches: number;
  totalBreaches: number;
  rings: Ring[];
  particles: Particle[];
  activePowerUp: PowerUp | null;
  floatingPowerUp: PowerUp | null;
  screenShake: number;
  lastBreachTime: number;
  gameTime: number;
  flawlessLevels: number;
  levelDamaged: boolean;
}

const GAME_CONFIG = getGameConfig('cyber-breach');

const COLORS = {
  primary: '#00ffff',
  secondary: '#bf00ff',
  success: '#6cff61',
  danger: '#ff0040',
  warning: '#ffaa00',
};

const COMBO_MULTIPLIERS = [
  { threshold: 10, multiplier: 3.0 },
  { threshold: 5, multiplier: 2.0 },
  { threshold: 3, multiplier: 1.5 },
  { threshold: 2, multiplier: 1.2 },
];

function getComboMultiplier(combo: number): number {
  for (const tier of COMBO_MULTIPLIERS) {
    if (combo >= tier.threshold) return tier.multiplier;
  }
  return 1.0;
}

function generateRings(level: number): Ring[] {
  const ringCount = Math.min(2 + Math.floor(level / 2), 8);
  const baseSpeed = 0.5 + (level * 0.15);
  const baseGapSize = Math.max(30 - (level * 2), 8);
  
  const rings: Ring[] = [];
  const colors = [COLORS.primary, COLORS.secondary, COLORS.success, '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#00d2d3'];
  
  for (let i = 0; i < ringCount; i++) {
    const speedVariation = 0.3 + (Math.random() * 0.4);
    const gapVariation = 0.8 + (Math.random() * 0.4);
    
    rings.push({
      radius: 60 + (i * 35),
      speed: baseSpeed * speedVariation * (i % 2 === 0 ? 1 : 0.7),
      gapSize: baseGapSize * gapVariation,
      gapPosition: Math.random() * 360,
      direction: i % 2 === 0 ? 1 : -1,
      color: colors[i % colors.length],
    });
  }
  
  return rings;
}

function checkAlignment(rings: Ring[], tolerance: number = 5): { aligned: boolean; quality: 'perfect' | 'near' | 'normal' | 'miss' } {
  if (rings.length === 0) return { aligned: true, quality: 'perfect' };
  
  const targetAngle = 90;
  
  for (const ring of rings) {
    let gapStart = ring.gapPosition;
    let gapEnd = ring.gapPosition + ring.gapSize;
    
    gapStart = ((gapStart % 360) + 360) % 360;
    gapEnd = ((gapEnd % 360) + 360) % 360;
    
    let inGap = false;
    if (gapStart < gapEnd) {
      inGap = targetAngle >= gapStart && targetAngle <= gapEnd;
    } else {
      inGap = targetAngle >= gapStart || targetAngle <= gapEnd;
    }
    
    if (!inGap) {
      const distToGapCenter = Math.abs(((ring.gapPosition + ring.gapSize / 2) - targetAngle + 180) % 360 - 180);
      if (distToGapCenter > tolerance + ring.gapSize / 2) {
        return { aligned: false, quality: 'miss' };
      }
    }
  }
  
  let minDist = Infinity;
  for (const ring of rings) {
    const gapCenter = ring.gapPosition + ring.gapSize / 2;
    const dist = Math.abs(((gapCenter - targetAngle) + 180) % 360 - 180);
    minDist = Math.min(minDist, dist);
  }
  
  if (minDist <= 1) return { aligned: true, quality: 'perfect' };
  if (minDist <= 3) return { aligned: true, quality: 'near' };
  return { aligned: true, quality: 'normal' };
}

function createParticles(x: number, y: number, color: string, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      id: `${Date.now()}-${i}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 4,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
    });
  }
  return particles;
}

export default function CyberBreach() {
  const [, setLocation] = useLocation();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  const { submitScore, myStats, refreshStats } = useGameScoresLocal();
  const { access, recordPlay, isHolder, isLoading: accessLoading } = useGameAccess();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    status: 'menu',
    level: 1,
    breachesCompleted: 0,
    breachesRequired: 10,
    score: 0,
    shields: 3,
    maxShields: 5,
    combo: 0,
    maxCombo: 0,
    perfectBreaches: 0,
    totalBreaches: 0,
    rings: [],
    particles: [],
    activePowerUp: null,
    floatingPowerUp: null,
    screenShake: 0,
    lastBreachTime: 0,
    gameTime: 0,
    flawlessLevels: 0,
    levelDamaged: false,
  });
  
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [gameStatus, setGameStatus] = useState<GameStatus>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shields, setShields] = useState(3);
  const [combo, setCombo] = useState(0);
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
  
  const playSound = useCallback((type: 'success' | 'perfect' | 'near' | 'miss' | 'powerup' | 'levelup') => {
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
          osc.frequency.value = 880;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          break;
        case 'near':
          osc.frequency.value = 660;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          break;
        case 'success':
          osc.frequency.value = 440;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          break;
        case 'miss':
          osc.frequency.value = 110;
          osc.type = 'square';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          break;
        case 'powerup':
          osc.frequency.setValueAtTime(523, ctx.currentTime);
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.05);
          osc.frequency.setValueAtTime(784, ctx.currentTime + 0.1);
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
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
      }
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.debug('[CyberBreach] Audio error:', e);
    }
  }, [soundEnabled, initAudio]);
  
  const updateState = useCallback(() => {
    const state = gameStateRef.current;
    setScore(state.score);
    setLevel(state.level);
    setShields(state.shields);
    setCombo(state.combo);
  }, []);
  
  const handleBreach = useCallback(() => {
    const state = gameStateRef.current;
    if (state.status !== 'playing') return;
    
    const alignment = checkAlignment(state.rings);
    const canvas = canvasRef.current;
    const centerX = canvas ? canvas.width / 2 : 200;
    const centerY = canvas ? canvas.height / 2 : 200;
    
    if (alignment.aligned) {
      let points = 100;
      let soundType: 'success' | 'perfect' | 'near' = 'success';
      
      if (alignment.quality === 'perfect') {
        points = 250;
        soundType = 'perfect';
        state.perfectBreaches++;
      } else if (alignment.quality === 'near') {
        points = 150;
        soundType = 'near';
      }
      
      state.combo++;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.totalBreaches++;
      state.breachesCompleted++;
      
      const multiplier = getComboMultiplier(state.combo);
      const earnedPoints = Math.floor(points * multiplier);
      state.score += earnedPoints;
      
      if (state.totalBreaches % 5 === 0 && state.shields < state.maxShields) {
        state.shields++;
      }
      
      const particleColor = alignment.quality === 'perfect' ? COLORS.success : 
                           alignment.quality === 'near' ? COLORS.primary : '#ffffff';
      state.particles.push(...createParticles(centerX, centerY, particleColor, alignment.quality === 'perfect' ? 30 : 15));
      
      playSound(soundType);
      
      if (state.breachesCompleted >= state.breachesRequired) {
        state.level++;
        const levelBonus = state.level * 500;
        state.score += levelBonus;
        
        if (!state.levelDamaged) {
          state.score += 1000;
          state.flawlessLevels++;
        }
        
        state.breachesCompleted = 0;
        state.breachesRequired = 10;
        state.levelDamaged = false;
        state.rings = generateRings(state.level);
        
        playSound('levelup');
        
        setGameStatus('levelComplete');
        state.status = 'levelComplete';
        
        setTimeout(() => {
          if (gameStateRef.current.status === 'levelComplete') {
            gameStateRef.current.status = 'playing';
            setGameStatus('playing');
          }
        }, 2000);
      }
    } else {
      state.combo = 0;
      state.shields--;
      state.levelDamaged = true;
      state.screenShake = 10;
      
      state.particles.push(...createParticles(centerX, centerY, COLORS.danger, 20));
      
      playSound('miss');
      
      if (state.shields <= 0) {
        state.status = 'gameover';
        setGameStatus('gameover');
        
        if (state.score > 0) {
          submitScore(state.score, state.level);
          recordPlay();
          refreshStats();
          
          trackEvent('game_complete', 'cyber-breach', String(state.level), state.score);
        }
      }
    }
    
    state.lastBreachTime = Date.now();
    updateState();
  }, [playSound, submitScore, recordPlay, refreshStats, updateState]);
  
  const gameLoop = useCallback((timestamp: number) => {
    const state = gameStateRef.current;
    
    if (state.status !== 'playing' && state.status !== 'levelComplete') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
    lastTimeRef.current = timestamp;
    
    state.gameTime += deltaTime;
    
    const speedMultiplier = state.activePowerUp?.type === 'slowmo' ? 0.5 : 1;
    
    for (const ring of state.rings) {
      ring.gapPosition += ring.speed * ring.direction * speedMultiplier;
      ring.gapPosition = ((ring.gapPosition % 360) + 360) % 360;
    }
    
    if (state.activePowerUp) {
      state.activePowerUp.duration -= deltaTime;
      if (state.activePowerUp.duration <= 0) {
        state.activePowerUp = null;
      }
    }
    
    if (state.floatingPowerUp) {
      state.floatingPowerUp.y += state.floatingPowerUp.vy * deltaTime;
      const canvas = canvasRef.current;
      if (canvas && state.floatingPowerUp.y > canvas.height) {
        state.floatingPowerUp = null;
      }
    }
    
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= deltaTime / p.maxLife;
      return p.life > 0;
    });
    
    if (state.screenShake > 0) {
      state.screenShake *= 0.9;
      if (state.screenShake < 0.1) state.screenShake = 0;
    }
    
    render();
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = gameStateRef.current;
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.save();
    
    if (state.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.screenShake;
      const shakeY = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(shakeX, shakeY);
    }
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height));
    gradient.addColorStop(0, 'rgba(0, 20, 40, 1)');
    gradient.addColorStop(0.5, 'rgba(10, 0, 30, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    for (const ring of state.rings) {
      ctx.beginPath();
      
      const gapStart = (ring.gapPosition * Math.PI) / 180;
      const gapEnd = ((ring.gapPosition + ring.gapSize) * Math.PI) / 180;
      
      ctx.arc(centerX, centerY, ring.radius, gapEnd, gapStart + Math.PI * 2);
      
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      const gapCenterAngle = (ring.gapPosition + ring.gapSize / 2) * Math.PI / 180;
      const gapX = centerX + Math.cos(gapCenterAngle) * ring.radius;
      const gapY = centerY + Math.sin(gapCenterAngle) * ring.radius;
      
      ctx.beginPath();
      ctx.arc(gapX, gapY, 6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.success;
      ctx.shadowColor = COLORS.success;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    const targetAngle = Math.PI / 2;
    const lineLength = state.rings.length > 0 ? state.rings[state.rings.length - 1].radius + 30 : 100;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(targetAngle) * lineLength, centerY + Math.sin(targetAngle) * lineLength);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const coreRadius = 25;
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    coreGradient.addColorStop(0, COLORS.primary);
    coreGradient.addColorStop(0.7, COLORS.secondary);
    coreGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.shadowColor = COLORS.primary;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    if (state.floatingPowerUp) {
      const pu = state.floatingPowerUp;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 20, 0, Math.PI * 2);
      
      const puColor = pu.type === 'slowmo' ? '#ffaa00' : 
                     pu.type === 'shield' ? '#00ff00' : 
                     pu.type === 'ghost' ? '#ff00ff' : '#00ffff';
      ctx.fillStyle = puColor;
      ctx.shadowColor = puColor;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = pu.type === 'slowmo' ? '⏰' : 
                  pu.type === 'shield' ? '🛡️' : 
                  pu.type === 'ghost' ? '👻' : '⚡';
      ctx.fillText(icon, pu.x, pu.y);
    }
    
    for (const particle of state.particles) {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    
    if (state.activePowerUp) {
      const puColor = state.activePowerUp.type === 'slowmo' ? '#ffaa00' : 
                     state.activePowerUp.type === 'shield' ? '#00ff00' : 
                     state.activePowerUp.type === 'ghost' ? '#ff00ff' : '#00ffff';
      ctx.strokeStyle = puColor;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.3 + Math.sin(state.gameTime * 5) * 0.2;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.globalAlpha = 1;
    }
    
    if (state.status === 'levelComplete') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.font = 'bold 36px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.success;
      ctx.shadowColor = COLORS.success;
      ctx.shadowBlur = 20;
      ctx.fillText(`LEVEL ${state.level} COMPLETE!`, centerX, centerY - 20);
      ctx.shadowBlur = 0;
      
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`+${state.level * 500} points`, centerX, centerY + 20);
      
      if (!state.levelDamaged) {
        ctx.fillStyle = COLORS.warning;
        ctx.fillText('FLAWLESS! +1000', centerX, centerY + 50);
      }
    }
    
    ctx.restore();
  }, []);
  
  const startGame = useCallback(() => {
    if (!access.canPlay) {
      toast({
        title: "Daily Limit Reached",
        description: access.reason || "You've reached your 10 games for today. Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }
    
    const state = gameStateRef.current;
    state.status = 'playing';
    state.level = 1;
    state.breachesCompleted = 0;
    state.breachesRequired = 10;
    state.score = 0;
    state.shields = 3;
    state.combo = 0;
    state.maxCombo = 0;
    state.perfectBreaches = 0;
    state.totalBreaches = 0;
    state.rings = generateRings(1);
    state.particles = [];
    state.activePowerUp = null;
    state.floatingPowerUp = null;
    state.screenShake = 0;
    state.gameTime = 0;
    state.flawlessLevels = 0;
    state.levelDamaged = false;
    
    setGameStatus('playing');
    updateState();
    
    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    trackEvent('game_start', 'cyber-breach', '1');
  }, [access.canPlay, toast, gameLoop, updateState]);
  
  const pauseGame = useCallback(() => {
    const state = gameStateRef.current;
    if (state.status === 'playing') {
      state.status = 'paused';
      setGameStatus('paused');
    }
  }, []);
  
  const resumeGame = useCallback(() => {
    const state = gameStateRef.current;
    if (state.status === 'paused') {
      state.status = 'playing';
      setGameStatus('playing');
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
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        const size = Math.min(container.clientWidth - 32, 600);
        canvas.width = size;
        canvas.height = size;
        render();
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [render]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameStateRef.current.status === 'playing') {
          handleBreach();
        } else if (gameStateRef.current.status === 'menu') {
          startGame();
        }
      } else if (e.code === 'Escape') {
        if (gameStateRef.current.status === 'playing') {
          pauseGame();
        } else if (gameStateRef.current.status === 'paused') {
          resumeGame();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBreach, startGame, pauseGame, resumeGame]);
  
  const hudStats: HUDStat[] = [
    { icon: Heart, value: shields, color: 'text-red-400' },
    { icon: Target, label: 'Level', value: level, color: 'text-purple-400' },
  ];
  
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
        <Navbar activeTab="arcade" />
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      <Navbar activeTab="arcade" />
      
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex items-center justify-between mb-4">
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
        
        <div className="max-w-2xl mx-auto">
          {gameStatus === 'playing' || gameStatus === 'levelComplete' ? (
            <div className="space-y-4">
              <GameHUD
                score={score}
                combo={combo}
                onPause={pauseGame}
                extraStats={hudStats}
              />
              
              <Card 
                className="bg-black/40 border border-cyan-500/20 p-4 cursor-pointer touch-none select-none"
                onClick={handleBreach}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleBreach();
                }}
                data-testid="game-canvas-container"
              >
                <canvas
                  ref={canvasRef}
                  className="w-full mx-auto rounded-lg"
                  data-testid="game-canvas"
                />
                
                <div className="text-center mt-4">
                  <p className="text-gray-400 text-sm">
                    Tap or press SPACE when gaps align
                  </p>
                  <div className="flex justify-center gap-4 mt-2">
                    <span className="text-cyan-400 text-xs">
                      Breaches: {gameStateRef.current.breachesCompleted}/{gameStateRef.current.breachesRequired}
                    </span>
                    {combo > 1 && (
                      <span className="text-orange-400 text-xs animate-pulse">
                        {combo}x Combo ({getComboMultiplier(combo).toFixed(1)}x)
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ) : gameStatus === 'paused' ? (
            <Card className="bg-black/40 border border-cyan-500/20 p-8 text-center">
              <h2 className="text-3xl font-orbitron font-bold text-white mb-6">PAUSED</h2>
              
              <div className="space-y-4">
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
          ) : gameStatus === 'gameover' ? (
            <VictoryScreen
              gameType="cyber-breach"
              score={score}
              extraStats={[
                { icon: Target, label: 'Breaches', value: gameStateRef.current.totalBreaches, color: 'text-cyan-400' },
                { icon: Zap, label: 'Perfect', value: gameStateRef.current.perfectBreaches, color: 'text-green-400' },
                { icon: Flame, label: 'Max Combo', value: gameStateRef.current.maxCombo, color: 'text-orange-400' },
                { icon: Trophy, label: 'Level', value: level, color: 'text-purple-400' },
              ]}
              playsRemaining={Math.max(0, GAME_CONFIG.maxPlaysPerDay - playsToday)}
              maxPlays={GAME_CONFIG.maxPlaysPerDay}
              isNewBest={score > 0 && score >= highScore}
              personalBest={highScore}
              onPlayAgain={startGame}
              onExit={exitToArcade}
            />
          ) : (
            <Card className="bg-black/40 border border-cyan-500/20 overflow-hidden">
              <div className="relative h-48 bg-gradient-to-r from-cyan-500/20 to-green-500/20 flex items-center justify-center">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,black_70%)]" />
                </div>
                <Zap className="w-24 h-24 text-cyan-400" />
              </div>
              
              <div className="p-8">
                <h1 className="text-4xl font-orbitron font-bold text-white text-center mb-2">
                  CYBER BREACH
                </h1>
                <p className="text-gray-400 text-center mb-6">
                  Hack through rotating security rings with perfect timing
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/40 rounded-lg p-4 border border-cyan-500/20">
                    <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white text-center">{highScore.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 text-center">High Score</p>
                  </div>
                  
                  <div className="bg-black/40 rounded-lg p-4 border border-cyan-500/20">
                    <Play className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white text-center">{playsToday}/10</p>
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
                  Press SPACE or tap anywhere to breach
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTutorial(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-orbitron font-bold text-white mb-4">How to Play</h2>
              
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold">1</span>
                  </div>
                  <p>Watch the rotating security rings. Each ring has a gap.</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold">2</span>
                  </div>
                  <p>Tap or press SPACE when ALL gaps align with the target line (pointing down).</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold">3</span>
                  </div>
                  <p>Build combos for multiplied points. Perfect timing = 250 pts!</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-red-400" />
                  </div>
                  <p>Miss the gap and you lose a shield. 0 shields = game over!</p>
                </div>
              </div>
              
              <Button
                onClick={() => setShowTutorial(false)}
                className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-purple-500"
                data-testid="button-close-tutorial"
              >
                Got it!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
