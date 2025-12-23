import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGameScoresLocal } from '@/hooks/useGameScoresLocal';
import { useGameAccess } from '@/hooks/useGameAccess';
import { trackEvent } from '@/lib/analytics';
import { GameStorageManager } from '@/lib/gameStorage';
import { getGameConfig } from '@/lib/gameRegistry';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { RingThemeSelector } from '@/components/game/CosmeticSelector';
import { useUnlockables, RING_THEMES, RingTheme } from '@/hooks/useUnlockables';
import { Play, Home, Trophy, Heart, Target, Sparkles, Palette } from 'lucide-react';
import { useGameMusic } from '@/hooks/useGameMusic';
import { MusicControls } from '@/components/game/MusicControls';
import { AnimatePresence } from 'framer-motion';
import { isMobile, haptic } from '@/lib/mobileUtils';

interface Ring {
  angle: number;
  speed: number;
  radius: number;
  gapAngle: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

interface GameState {
  rings: Ring[];
  score: number;
  level: number;
  lives: number;
  combo: number;
  perfectStreak: number;
  particles: Particle[];
  stars: Star[];
  feedback: 'perfect' | 'good' | 'miss' | null;
  feedbackTimer: number;
  feedbackText: string | null;
  gameOver: boolean;
}

type GamePhase = 'menu' | 'playing' | 'gameover';

const BASE_CANVAS_SIZE = 350;
const BASE_CENTER = BASE_CANVAS_SIZE / 2;
const GAP_SIZE = 40;
const PERFECT_THRESHOLD = 20;
const GOOD_THRESHOLD = 40;

const RING_COLORS = ['#00FFFF', '#A855F7', '#FBBF24', '#10B981', '#F43F5E'];

// Realm names for level progression
function getLevelRealm(level: number): { name: string; color: string; description: string } {
  if (level <= 5) return { name: 'INITIATE', color: '#00FFFF', description: 'The journey begins...' };
  if (level <= 10) return { name: 'ADEPT', color: '#A855F7', description: 'Your skills awaken' };
  if (level <= 15) return { name: 'MASTER', color: '#FBBF24', description: 'Cosmic wisdom flows through you' };
  return { name: 'TRANSCENDENT', color: '#F43F5E', description: 'One with the cosmos' };
}

function getLevelConfig(level: number) {
  if (level <= 3) return { ringCount: 2, baseSpeed: 0.8 + level * 0.2 };
  if (level <= 6) return { ringCount: 2, baseSpeed: 1.2 + (level - 3) * 0.3 };
  if (level <= 10) return { ringCount: 3, baseSpeed: 1.5 + (level - 6) * 0.2 };
  return { ringCount: 3, baseSpeed: 2 + (level - 10) * 0.15 };
}

function createRings(level: number): Ring[] {
  const config = getLevelConfig(level);
  const rings: Ring[] = [];
  const baseRadius = 50;
  const radiusStep = 35;
  
  for (let i = 0; i < config.ringCount; i++) {
    const direction = i % 2 === 0 ? 1 : -1;
    rings.push({
      angle: Math.random() * 360,
      speed: config.baseSpeed * direction * (0.8 + Math.random() * 0.4),
      radius: baseRadius + i * radiusStep,
      gapAngle: Math.random() * 360,
      color: RING_COLORS[i % RING_COLORS.length],
    });
  }
  return rings;
}

export default function RingGame() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { submitScore, myStats, refreshStats } = useGameScoresLocal();
  const { access, recordPlay, isLoading: nftLoading } = useGameAccess();
  const { selected, updateStats } = useUnlockables();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const currentTheme = useMemo(() => RING_THEMES[selected.ringTheme], [selected.ringTheme]);
  const music = useGameMusic();

  const gameConfig = useMemo(() => getGameConfig('ring-game'), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState(BASE_CANVAS_SIZE);

  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'perfect' | 'good' | 'miss' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showLevelBanner, setShowLevelBanner] = useState<string | null>(null);
  const [timeFrozen, setTimeFrozen] = useState(false);

  const stats = useMemo(() => ({
    gamesPlayed: myStats.totalGames || 0,
    bestScore: myStats.bestScore || 0,
    totalScore: myStats.lifetimeScore || 0,
  }), [myStats]);

  const currentRealm = useMemo(() => getLevelRealm(level), [level]);

  // Animated starfield background - declared before conditional returns
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const stars: { x: number; y: number; size: number; speed: number; color: string }[] = [];
    for (let i = 0; i < 150; i++) {
      const colors = ['#00ffff', '#ff00ff', '#ffff00', '#ffffff'];
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    let animId: number;
    const animate = () => {
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      
      const cx = bgCanvas.width / 2;
      const cy = bgCanvas.height / 2;
      for (let r = 100; r < Math.max(bgCanvas.width, bgCanvas.height); r += 150) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.03 - r * 0.00002})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      stars.forEach(star => {
        star.y += star.speed;
        if (star.y > bgCanvas.height) {
          star.y = 0;
          star.x = Math.random() * bgCanvas.width;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      
      animId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const playSound = useCallback((type: 'perfect' | 'good' | 'miss' | 'gameover') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'perfect':
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'good':
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.setValueAtTime(700, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          break;
        case 'miss':
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          break;
        case 'gameover':
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
          break;
      }
    } catch (e) {}
  }, [soundEnabled]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 2 + Math.random() * 4,
      });
    }
    return particles;
  }, []);

  const createStars = useCallback((count: number): Star[] => {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * BASE_CANVAS_SIZE,
        y: Math.random() * BASE_CANVAS_SIZE,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.3,
        brightness: 0.3 + Math.random() * 0.7,
      });
    }
    return stars;
  }, []);

  const initGame = useCallback((): GameState => {
    return {
      rings: createRings(1),
      score: 0,
      level: 1,
      lives: 3,
      combo: 0,
      perfectStreak: 0,
      particles: [],
      stars: createStars(50),
      feedback: null,
      feedbackTimer: 0,
      feedbackText: null,
      gameOver: false,
    };
  }, [createStars]);

  const checkAlignment = useCallback((state: GameState): 'perfect' | 'good' | 'miss' => {
    const targetAngle = 270;
    
    for (const ring of state.rings) {
      let gapStart = (ring.angle + ring.gapAngle) % 360;
      let gapEnd = (gapStart + GAP_SIZE) % 360;
      
      let inGap = false;
      if (gapStart < gapEnd) {
        inGap = targetAngle >= gapStart && targetAngle <= gapEnd;
      } else {
        inGap = targetAngle >= gapStart || targetAngle <= gapEnd;
      }
      
      if (!inGap) {
        let distance = Math.abs(targetAngle - (gapStart + GAP_SIZE / 2));
        if (distance > 180) distance = 360 - distance;
        
        if (distance <= GOOD_THRESHOLD) continue;
        return 'miss';
      }
    }
    
    let allPerfect = true;
    for (const ring of state.rings) {
      let gapCenter = (ring.angle + ring.gapAngle + GAP_SIZE / 2) % 360;
      let distance = Math.abs(270 - gapCenter);
      if (distance > 180) distance = 360 - distance;
      if (distance > PERFECT_THRESHOLD) allPerfect = false;
    }
    
    return allPerfect ? 'perfect' : 'good';
  }, []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 100) return;
    lastTapTimeRef.current = now;
    
    const state = gameStateRef.current;
    if (!state || state.gameOver || state.feedbackTimer > 0) return;

    const result = checkAlignment(state);
    state.feedback = result;
    state.feedbackTimer = 60;

    if (result === 'perfect') {
      state.combo++;
      state.perfectStreak++;
      
      // Streak bonus: +50 per streak level
      const streakBonus = state.perfectStreak * 50;
      const basePoints = 100 * Math.min(state.combo, 10);
      const points = basePoints + streakBonus;
      state.score += points;
      state.particles.push(...createParticles(BASE_CENTER, BASE_CENTER - state.rings[state.rings.length - 1].radius - 20, '#00FF88', 15 + state.perfectStreak));
      
      // Enhanced streak milestones
      if (state.perfectStreak === 5) {
        state.feedbackText = '5 STREAK! ⭐';
        state.score += 250;
      } else if (state.perfectStreak === 10) {
        state.feedbackText = 'UNSTOPPABLE! 🔥';
        state.score += 1000;
      } else if (state.perfectStreak === 15) {
        state.feedbackText = 'LEGENDARY! 👑';
        state.score += 2500;
      } else if (state.perfectStreak >= 3) {
        state.feedbackText = `PERFECT STREAK: ${state.perfectStreak}`;
      }
      
      playSound('perfect');
      if (isMobile && hapticEnabled) {
        if (state.perfectStreak === 5 || state.perfectStreak === 10 || state.perfectStreak === 15) {
          haptic.comboMilestone();
        } else {
          haptic.perfect();
        }
      }
      setTimeFrozen(true);
      setTimeout(() => setTimeFrozen(false), 150);
    } else if (result === 'good') {
      state.combo++;
      // Good keeps the combo but resets perfect streak
      state.perfectStreak = 0;
      const points = 50 * Math.min(state.combo, 10);
      state.score += points;
      state.particles.push(...createParticles(BASE_CENTER, BASE_CENTER - state.rings[state.rings.length - 1].radius - 20, '#FBBF24', 10));
      state.feedbackText = null;
      playSound('good');
      if (isMobile && hapticEnabled) haptic.good();
    } else {
      state.combo = 0;
      state.perfectStreak = 0;
      state.lives--;
      state.feedbackText = null;
      state.particles.push(...createParticles(BASE_CENTER, BASE_CENTER, '#EF4444', 12));
      playSound('miss');
      if (isMobile && hapticEnabled) haptic.miss();
      
      if (state.lives <= 0) {
        state.gameOver = true;
        playSound('gameover');
        if (isMobile && hapticEnabled) haptic.gameOver();
        return;
      }
    }

    if (result !== 'miss') {
      state.level++;
      state.rings = createRings(state.level);
      state.feedbackText = null; // Clear special feedback
      
      // Realm transition banners
      if (state.level === 6) {
        setShowLevelBanner('REALM: ADEPT');
        if (isMobile && hapticEnabled) haptic.levelUp();
        setTimeout(() => setShowLevelBanner(null), 2000);
      } else if (state.level === 11) {
        setShowLevelBanner('REALM: MASTER');
        if (isMobile && hapticEnabled) haptic.levelUp();
        setTimeout(() => setShowLevelBanner(null), 2000);
      } else if (state.level === 16) {
        setShowLevelBanner('REALM: TRANSCENDENT');
        if (isMobile && hapticEnabled) haptic.levelUp();
        setTimeout(() => setShowLevelBanner(null), 2000);
      }
    }
  }, [checkAlignment, createParticles, playSound, hapticEnabled]);

  const updateFrozenRef = useRef(false);
  updateFrozenRef.current = timeFrozen;
  
  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.gameOver || updateFrozenRef.current) return;

    for (const ring of state.rings) {
      ring.angle = (ring.angle + ring.speed) % 360;
    }

    // Animate stars (parallax scrolling)
    for (const star of state.stars) {
      star.y += star.speed;
      if (star.y > BASE_CANVAS_SIZE) {
        star.y = 0;
        star.x = Math.random() * BASE_CANVAS_SIZE;
      }
      // Subtle twinkle
      star.brightness = 0.3 + Math.sin(Date.now() * 0.001 + star.x) * 0.3 + 0.4;
    }

    if (state.feedbackTimer > 0) {
      state.feedbackTimer--;
      if (state.feedbackTimer === 0) {
        state.feedback = null;
        state.feedbackText = null;
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].x += state.particles[i].vx;
      state.particles[i].y += state.particles[i].vy;
      state.particles[i].life -= 0.025;
      if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }

    setScore(state.score);
    setLevel(state.level);
    setLives(state.lives);
    setCombo(state.combo);
    setFeedback(state.feedback);
    
    // Dynamic music - tempo increases with level
    const tempo = 1 + (state.level - 1) * 0.1;
    music.setTempo(Math.min(2, tempo));
    
    // Intensity based on level
    const intensity = Math.min(1, state.level / 20);
    music.setGameIntensity(intensity);
    
    // Danger when low on lives
    music.setDanger(state.lives <= 1, state.lives === 1 ? 0.8 : 0.4);
  }, [music]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const size = canvasSize;
    const center = size / 2;
    const scale = size / BASE_CANVAS_SIZE;
    const realm = getLevelRealm(state.level);

    // Deep space gradient background
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, size / 2);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#050510');
    gradient.addColorStop(1, '#000005');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Animated starfield
    for (const star of state.stars) {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.beginPath();
      ctx.arc(star.x * scale, star.y * scale, star.size * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle concentric guide rings with realm color
    ctx.strokeStyle = `${realm.color}15`;
    ctx.lineWidth = 1;
    for (let r = 30 * scale; r < size / 2; r += 30 * scale) {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Target indicator at top
    ctx.fillStyle = `${realm.color}50`;
    ctx.beginPath();
    ctx.moveTo(center, 15 * scale);
    ctx.lineTo(center - 12 * scale, 40 * scale);
    ctx.lineTo(center + 12 * scale, 40 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Glow effect for target
    ctx.shadowColor = realm.color;
    ctx.shadowBlur = 20 * scale;
    ctx.fillStyle = realm.color;
    ctx.beginPath();
    ctx.arc(center, 25 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw rings with enhanced glow and rune-like markings
    for (let i = 0; i < state.rings.length; i++) {
      const ring = state.rings[i];
      const gapStart = ((ring.angle + ring.gapAngle - 90) * Math.PI) / 180;
      const gapEnd = ((ring.angle + ring.gapAngle + GAP_SIZE - 90) * Math.PI) / 180;

      // Outer glow layer
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 16 * scale;
      ctx.lineCap = 'round';
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 20 * scale;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(center, center, ring.radius * scale, gapEnd, gapStart + Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Main ring
      ctx.lineWidth = 12 * scale;
      ctx.shadowBlur = 10 * scale;
      ctx.beginPath();
      ctx.arc(center, center, ring.radius * scale, gapEnd, gapStart + Math.PI * 2);
      ctx.stroke();

      // Gap (bright portal)
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 14 * scale;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 25 * scale;
      ctx.beginPath();
      ctx.arc(center, center, ring.radius * scale, gapStart, gapEnd);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
    }

    // Particles
    for (const particle of state.particles) {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8 * scale;
      ctx.beginPath();
      ctx.arc(particle.x * scale, particle.y * scale, particle.size * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Feedback text
    if (state.feedback) {
      ctx.font = `bold ${Math.floor(28 * scale)}px Orbitron, monospace`;
      ctx.textAlign = 'center';
      
      if (state.feedback === 'perfect') {
        // Special text for perfect streaks
        if (state.feedbackText) {
          ctx.shadowColor = '#00FF88';
          ctx.shadowBlur = 15 * scale;
          ctx.fillStyle = '#00FF88';
          ctx.fillText(state.feedbackText, center, center - 20 * scale);
        } else {
          ctx.fillStyle = '#00FF88';
          ctx.fillText('PERFECT!', center, center - 10 * scale);
        }
        if (state.combo > 1 && !state.feedbackText) {
          ctx.font = `bold ${Math.floor(18 * scale)}px Orbitron, monospace`;
          ctx.fillStyle = '#FBBF24';
          ctx.fillText(`x${state.combo}`, center, center + 15 * scale);
        }
      } else if (state.feedback === 'good') {
        ctx.fillStyle = '#FBBF24';
        ctx.fillText('GOOD', center, center);
      } else {
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 10 * scale;
        ctx.fillStyle = '#EF4444';
        ctx.fillText('MISS', center, center);
      }
      ctx.shadowBlur = 0;
    }

    // Level display with realm name
    if (!state.feedback) {
      ctx.fillStyle = realm.color;
      ctx.font = `bold ${Math.floor(10 * scale)}px Orbitron, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(realm.name, center, center - 25 * scale);
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(44 * scale)}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = realm.color;
    ctx.shadowBlur = 10 * scale;
    ctx.fillText(`${state.level}`, center, center + (state.feedback ? 55 * scale : 12 * scale));
    ctx.shadowBlur = 0;
    
    ctx.font = `${Math.floor(12 * scale)}px Orbitron, monospace`;
    ctx.fillStyle = '#666666';
    ctx.fillText('RING', center, center + (state.feedback ? 72 * scale : 28 * scale));
  }, [canvasSize]);

  const gameLoop = useCallback(() => {
    update();
    render();
    const state = gameStateRef.current;
    if (state && state.gameOver) {
      setGamePhase('gameover');
      const playerAddress = address || 'anonymous';
      const today = new Date().toDateString();
      const dailyData = GameStorageManager.getDailyData('ring-game', playerAddress, today);
      GameStorageManager.updateDailyData('ring-game', playerAddress, today, {
        gamesPlayed: dailyData.gamesPlayed + 1,
        pointsEarned: dailyData.pointsEarned + state.score
      });
      if (address && state.score > 0) {
        submitScore(state.score, state.level);
        refreshStats();
      }
      // Track unlocks
      updateStats('ring-game', { maxRing: state.level });
      music.stopMusic();
      trackEvent('game_complete', 'ring-game', String(state.level), state.score);
      return;
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [update, render, address, submitScore, refreshStats]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gamePhase, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && gamePhase === 'playing') {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gamePhase, handleTap]);

  useEffect(() => {
    const updateSize = () => {
      // Fullscreen: 95% of true viewport for ≥90% coverage
      // Canvas extends under floating HUD/navbar for maximum size
      const size = Math.max(1, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.95));
      setCanvasSize(size);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [canvasSize]);

  const startGame = useCallback(() => {
    if (!address) {
      toast({ title: "Wallet Required", description: "Connect your wallet to play", variant: "destructive" });
      return;
    }
    if (!access.canPlay) {
      toast({ title: "No Plays Left", description: access.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    const dailyLimits = GameStorageManager.checkDailyLimits('ring-game', address, gameConfig.maxPlaysPerDay, 50000);
    if (!dailyLimits.canPlay) {
      toast({ title: "Daily Limit Reached", description: dailyLimits.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    recordPlay();
    gameStateRef.current = initGame();
    setGamePhase('playing');
    setScore(0);
    setLevel(1);
    setLives(3);
    setCombo(0);
    setFeedback(null);
    music.startMusic();
    trackEvent('game_start', 'ring-game', '', 0);
  }, [address, access.canPlay, access.reason, gameConfig.maxPlaysPerDay, toast, initGame, recordPlay, music]);

  if (nftLoading) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cyan-400 font-orbitron">Loading Game...</p>
          </div>
        </section>
      </>
    );
  }

  if (gamePhase === 'menu') {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-16 pb-24">
          <div className="max-w-md mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
              <p className="text-cyan-400/60 text-xs font-orbitron tracking-[0.3em] mb-2">THE ALIGNMENT PROTOCOL</p>
              <h1 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-3">
                RING GAME
              </h1>
              <p className="text-gray-500 text-sm italic leading-relaxed px-4">
                "Ancient rings power the Guardian network.<br/>
                Align them to maintain the cosmic balance."
              </p>
            </motion.div>

            <Card className="bg-black/60 border-cyan-500/30 backdrop-blur-xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">Best: {stats.bestScore.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center mb-6">
                  <div><div className="text-2xl text-cyan-400 font-bold">{stats.gamesPlayed}</div><div className="text-xs text-gray-500">Games Played</div></div>
                  <div><div className="text-2xl text-purple-400 font-bold">{stats.totalScore.toLocaleString()}</div><div className="text-xs text-gray-500">Total Score</div></div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 rounded-lg border border-white/5">
                <h3 className="text-sm font-bold text-cyan-400 mb-3">THE PROTOCOL</h3>
                <div className="text-xs text-gray-400 space-y-2">
                  <p>• <span className="text-white">Ancient rings</span> rotate with glowing gaps</p>
                  <p>• <span className="text-white">Align</span> gaps at the top marker</p>
                  <p>• <span className="text-green-400">PERFECT</span> = 100 pts + <span className="text-purple-400">STREAK</span> bonus (+50/streak)</p>
                  <p>• <span className="text-yellow-400">GOOD</span> = 50 pts • <span className="text-red-400">MISS</span> = lose 1 life</p>
                  <p>• 5 streak = ⭐, 10 = <span className="text-orange-400">UNSTOPPABLE 🔥</span>, 15 = <span className="text-yellow-400">LEGENDARY 👑</span></p>
                  <p>• Advance through <span className="text-cyan-400">Initiate</span> → <span className="text-purple-400">Adept</span> → <span className="text-yellow-400">Master</span> → <span className="text-pink-400">Transcendent</span></p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <h3 className="text-sm font-bold text-cyan-400 mb-3">AUDIO</h3>
                <MusicControls
                  masterVolume={music.prefs.masterVolume}
                  musicEnabled={music.prefs.musicEnabled}
                  sfxEnabled={music.prefs.sfxEnabled}
                  onVolumeChange={music.setMasterVolume}
                  onMusicToggle={music.setMusicEnabled}
                  onSfxToggle={(enabled) => { music.setSfxEnabled(enabled); setSoundEnabled(enabled); }}
                  accentColor="cyan"
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Haptic Feedback</span>
                <Button variant="ghost" size="sm" onClick={() => setHapticEnabled(!hapticEnabled)} className={hapticEnabled ? 'text-cyan-400' : 'text-gray-500'} data-testid="button-toggle-haptic">
                  {hapticEnabled ? 'ON' : 'OFF'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 flex items-center gap-2"><Palette className="w-4 h-4" /> Ring Theme</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowThemeSelector(true)} 
                  className="text-cyan-400"
                  data-testid="button-theme-selector"
                >
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: currentTheme.colors.ring1 }} />
                  {currentTheme.name}
                </Button>
              </div>

              <Button onClick={startGame} disabled={!access.canPlay} className="w-full h-14 text-lg font-orbitron bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500" data-testid="button-start-game">
                <Play className="w-6 h-6 mr-2" />
                {!access.canPlay ? 'NO PLAYS LEFT' : 'START GAME'}
              </Button>
              {access.playsRemaining !== undefined && <p className="text-center text-sm text-gray-400 mt-3">{access.playsRemaining} plays remaining today</p>}
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => navigate('/arcade')} className="border-white/20" data-testid="button-back-arcade">
                <Home className="w-4 h-4 mr-2" /> Back to Arcade
              </Button>
            </div>
          </div>
        </section>
        
        {showThemeSelector && (
          <RingThemeSelector 
            onSelect={() => setShowThemeSelector(false)}
            onClose={() => setShowThemeSelector(false)}
          />
        )}
      </>
    );
  }

  if (gamePhase === 'gameover') {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-16 pb-24">
          <div className="max-w-md mx-auto px-4">
            <VictoryScreen
              gameType="ring-game"
              score={score}
              stats={[
                { icon: Target, label: 'Score', value: score.toLocaleString(), color: 'text-cyan-400' },
                { icon: Trophy, label: 'Level', value: level, color: 'text-purple-400' },
              ]}
              playsRemaining={Math.max(0, (access.playsRemaining || 0) - 1)}
              maxPlays={gameConfig.maxPlaysPerDay}
              isNewBest={score > stats.bestScore}
              onPlayAgain={startGame}
              onExit={() => navigate('/arcade')}
            />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
      <section className="fixed inset-0 bg-[#050510] pt-16 flex flex-col items-center justify-center overflow-hidden">
        {/* Animated starfield background - fills entire viewport */}
        <canvas ref={bgCanvasRef} className="absolute inset-0 z-0" style={{ top: 64 }} />
        
        {/* Floating HUD - overlays game */}
        <div className="absolute top-16 left-0 right-0 flex items-center justify-between px-4 py-2 z-20">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-orbitron tracking-wider" style={{ color: currentRealm.color }}>{currentRealm.name}</span>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-white font-mono font-bold text-sm">{score.toLocaleString()}</span>
              </div>
            </div>
            {combo > 1 && (
              <motion.span 
                className="text-yellow-400 font-bold text-sm px-2 py-0.5 bg-yellow-400/10 rounded"
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
              >
                x{combo}
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-4 h-4 transition-all ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-700 fill-gray-700'}`}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-cyan-400 h-8 w-8">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="relative z-10">
          <canvas
            ref={canvasRef}
            className="rounded-lg cursor-pointer shadow-[0_0_40px_rgba(0,255,255,0.3)]"
            style={{ touchAction: 'none', border: `2px solid ${currentRealm.color}60` }}
            onClick={handleTap}
            onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
            data-testid="game-canvas"
          />
          <AnimatePresence>
            {showLevelBanner && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="text-center px-6"
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <motion.div
                    className="text-sm font-orbitron tracking-[0.2em] text-white/60 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    ENTERING
                  </motion.div>
                  <motion.div 
                    className="text-2xl font-orbitron font-bold"
                    style={{ color: currentRealm.color, textShadow: `0 0 20px ${currentRealm.color}` }}
                  >
                    {showLevelBanner}
                  </motion.div>
                  <motion.p
                    className="mt-2 text-xs text-gray-400 italic"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {currentRealm.description}
                  </motion.p>
                  <motion.div
                    className="mt-3 flex justify-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentRealm.color }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {timeFrozen && (
            <motion.div 
              className="absolute inset-0 border-4 rounded-lg pointer-events-none"
              style={{ borderColor: currentRealm.color }}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: [0.8, 0.4, 0.8] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
          )}
        </div>

        {/* Floating bottom controls */}
        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center z-10">
          <p className="text-gray-500 text-[11px] text-center mb-2">Tap or press SPACE when gaps align</p>
          <Button
            onClick={handleTap}
            className="w-40 h-14 text-lg font-orbitron bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 active:scale-95 transition-transform shadow-[0_0_20px_#00FFFF40]"
            data-testid="button-tap"
          >
            ALIGN
          </Button>
        </div>
      </section>
    </>
  );
}
