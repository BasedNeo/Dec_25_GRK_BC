import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, RotateCcw, Trophy, Volume2, VolumeX, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import rocketImage from "@/assets/rocket-game.png";

interface Vector2 {
  x: number;
  y: number;
}

interface GameObject {
  pos: Vector2;
  vel: Vector2;
  size: Vector2;
  active: boolean;
}

interface Alien extends GameObject {
  type: 'glitch' | 'jelly' | 'serpent' | 'fractal' | 'sentinel';
  health: number;
  points: number;
  phase: number;
  segments?: Vector2[];
  shields?: number;
}

interface Bullet extends GameObject {
  isEnemy: boolean;
}

interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GameState {
  level: number;
  phase: 'menu' | 'shooter' | 'lander' | 'revelation' | 'gameover';
  player: GameObject & { fuel: number };
  bullets: Bullet[];
  aliens: Alien[];
  particles: Particle[];
  score: number;
  combatScore: number;
  lives: number;
  gameOver: boolean;
  levelComplete: boolean;
  landingVelocity: number;
  landingBonus: number;
  thrusting: boolean;
  wave: number;
  bossDefeated: boolean;
}

const RANKS = [
  { threshold: 0, title: 'Cadet', color: '#808080' },
  { threshold: 1000, title: 'Pilot', color: '#00ff88' },
  { threshold: 5000, title: 'Void Walker', color: '#00ffff' },
  { threshold: 15000, title: 'Star Commander', color: '#bf00ff' },
  { threshold: 50000, title: 'Fleet Admiral', color: '#ff8800' },
  { threshold: 100000, title: 'Based Eternal', color: '#ffd700' },
];

function getRank(score: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) return RANKS[i];
  }
  return RANKS[0];
}

const LANDER_CONFIG = {
  GRAVITY: 0.03,
  THRUST_POWER: 0.08,
  STRAFE_POWER: 0.05,
  MAX_VELOCITY: 6,
  FUEL_BURN_RATE: 0.3,
  SAFE_LANDING_VELOCITY: 2,
  PERFECT_LANDING_VELOCITY: 1,
};

export default function GuardianDefender() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketImgRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<{ left: boolean; right: boolean; up: boolean; fire: boolean }>({ left: false, right: false, up: false, fire: false });
  const lastShotRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    phase: 'menu',
    player: { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, size: { x: 40, y: 60 }, active: true, fuel: 100 },
    bullets: [],
    aliens: [],
    particles: [],
    score: 0,
    combatScore: 0,
    lives: 3,
    gameOver: false,
    levelComplete: false,
    landingVelocity: 0,
    landingBonus: 0,
    thrusting: false,
    wave: 1,
    bossDefeated: false,
  });
  
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lifetimeScore, setLifetimeScore] = useState(() => {
    return parseInt(localStorage.getItem('guardian_lifetime_score') || '0');
  });
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });
  
  useEffect(() => {
    const img = new Image();
    img.src = rocketImage;
    img.onload = () => {
      rocketImgRef.current = img;
    };
  }, []);
  
  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 500);
      const maxHeight = Math.min(window.innerHeight - 200, 700);
      const aspectRatio = 400 / 600;
      
      let width = maxWidth;
      let height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const scale = canvasSize.width / 400;
  
  const spawnAliens = useCallback((level: number, wave: number): Alien[] => {
    const aliens: Alien[] = [];
    const baseY = 50;
    
    switch (level) {
      case 1:
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 6; col++) {
            aliens.push({
              pos: { x: 50 + col * 50, y: baseY + row * 40 },
              vel: { x: 0.5, y: 0 },
              size: { x: 24, y: 24 },
              active: true,
              type: 'glitch',
              health: 1,
              points: 10,
              phase: Math.random() * Math.PI * 2,
            });
          }
        }
        break;
        
      case 2:
        for (let i = 0; i < 8; i++) {
          aliens.push({
            pos: { x: 30 + i * 45, y: baseY + Math.sin(i) * 30 },
            vel: { x: 0, y: 0.5 },
            size: { x: 30, y: 40 },
            active: true,
            type: 'jelly',
            health: 2,
            points: 25,
            phase: i * 0.5,
          });
        }
        if (wave >= 3) {
          aliens.push({
            pos: { x: 160, y: 30 },
            vel: { x: 0, y: 0 },
            size: { x: 80, y: 80 },
            active: true,
            type: 'sentinel',
            health: 10,
            points: 500,
            phase: 0,
            shields: 4,
          });
        }
        break;
        
      case 3:
        for (let i = 0; i < 3; i++) {
          const segments: Vector2[] = [];
          const startX = 80 + i * 120;
          for (let s = 0; s < 5; s++) {
            segments.push({ x: startX, y: baseY + s * 15 });
          }
          aliens.push({
            pos: { x: startX, y: baseY },
            vel: { x: (i % 2 === 0 ? 1 : -1) * 1.5, y: 0 },
            size: { x: 18, y: 18 },
            active: true,
            type: 'serpent',
            health: 5,
            points: 75,
            phase: i,
            segments,
          });
        }
        break;
        
      case 4:
        for (let i = 0; i < 3; i++) {
          aliens.push({
            pos: { x: 80 + i * 100, y: baseY },
            vel: { x: 0, y: 0.2 },
            size: { x: 40, y: 40 },
            active: true,
            type: 'fractal',
            health: 3,
            points: 100,
            phase: i * 2,
          });
        }
        if (wave >= 2) {
          aliens.push({
            pos: { x: 160, y: 30 },
            vel: { x: 0, y: 0 },
            size: { x: 80, y: 80 },
            active: true,
            type: 'sentinel',
            health: 15,
            points: 500,
            phase: 0,
            shields: 4,
          });
        }
        break;
    }
    
    return aliens;
  }, []);
  
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setGameState({
      level: 1,
      phase: 'shooter',
      player: { 
        pos: { x: 180, y: 520 }, 
        vel: { x: 0, y: 0 }, 
        size: { x: 40, y: 60 }, 
        active: true, 
        fuel: 100 
      },
      bullets: [],
      aliens: spawnAliens(1, 1),
      particles: [],
      score: 0,
      combatScore: 0,
      lives: 3,
      gameOver: false,
      levelComplete: false,
      landingVelocity: 0,
      landingBonus: 0,
      thrusting: false,
      wave: 1,
      bossDefeated: false,
    });
    setIsPaused(false);
  }, [spawnAliens]);
  
  const nextLevel = useCallback(() => {
    setGameState(prev => {
      const newLevel = prev.level + 1;
      if (newLevel > 5) {
        return { ...prev, phase: 'lander', player: { ...prev.player, pos: { x: 180, y: 50 }, vel: { x: 0, y: 0 }, fuel: 100 } };
      }
      if (newLevel === 5) {
        return { ...prev, level: 5, phase: 'lander', player: { ...prev.player, pos: { x: 180, y: 50 }, vel: { x: 0, y: 0 }, fuel: 100 }, levelComplete: false };
      }
      return {
        ...prev,
        level: newLevel,
        phase: 'shooter',
        player: { ...prev.player, pos: { x: 180, y: 520 }, vel: { x: 0, y: 0 } },
        bullets: [],
        aliens: spawnAliens(newLevel, 1),
        levelComplete: false,
        wave: 1,
        bossDefeated: false,
      };
    });
  }, [spawnAliens]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Space'].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current.add(e.key);
      
      if (e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  const handleTouchStart = useCallback((action: 'left' | 'right' | 'up' | 'fire') => {
    touchRef.current[action] = true;
  }, []);
  
  const handleTouchEnd = useCallback((action: 'left' | 'right' | 'up' | 'fire') => {
    touchRef.current[action] = false;
  }, []);
  
  useEffect(() => {
    if (gameState.phase === 'menu' || gameState.phase === 'revelation' || gameState.phase === 'gameover' || isPaused) {
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const gameLoop = () => {
      timeRef.current++;
      const time = timeRef.current;
      
      setGameState(prev => {
        if (prev.phase === 'menu' || prev.phase === 'revelation' || prev.phase === 'gameover') return prev;
        
        let newState = { ...prev };
        const keys = keysRef.current;
        const touch = touchRef.current;
        
        if (prev.phase === 'shooter') {
          const moveSpeed = 5;
          if (keys.has('ArrowLeft') || keys.has('a') || touch.left) {
            newState.player.pos.x = Math.max(20, prev.player.pos.x - moveSpeed);
          }
          if (keys.has('ArrowRight') || keys.has('d') || touch.right) {
            newState.player.pos.x = Math.min(380 - prev.player.size.x, prev.player.pos.x + moveSpeed);
          }
          
          if ((keys.has(' ') || keys.has('ArrowUp') || touch.fire) && time - lastShotRef.current > 15) {
            lastShotRef.current = time;
            newState.bullets = [...prev.bullets, {
              pos: { x: prev.player.pos.x + prev.player.size.x / 2 - 3, y: prev.player.pos.y - 10 },
              vel: { x: 0, y: -8 },
              size: { x: 6, y: 15 },
              active: true,
              isEnemy: false,
            }];
          }
          
          newState.bullets = prev.bullets
            .map(b => ({ ...b, pos: { x: b.pos.x + b.vel.x, y: b.pos.y + b.vel.y } }))
            .filter(b => b.pos.y > -20 && b.pos.y < 620);
          
          newState.aliens = prev.aliens.map(alien => {
            const updated = { ...alien, phase: alien.phase + 0.02 };
            
            switch (alien.type) {
              case 'glitch':
                updated.pos.x += alien.vel.x + Math.sin(time * 0.1 + alien.phase) * 0.3;
                updated.pos.y += 0.3;
                if (updated.pos.x < 20 || updated.pos.x > 360) {
                  updated.vel.x *= -1;
                }
                break;
              case 'jelly':
                updated.pos.x += Math.sin(time * 0.03 + alien.phase) * 1.5;
                updated.pos.y += 0.4;
                break;
              case 'serpent':
                if (alien.segments) {
                  const head = alien.segments[0];
                  head.x += alien.vel.x;
                  head.y += 0.3;
                  if (head.x < 30 || head.x > 370) {
                    updated.vel.x *= -1;
                  }
                  for (let i = 1; i < alien.segments.length; i++) {
                    const seg = alien.segments[i];
                    const prev = alien.segments[i - 1];
                    seg.x += (prev.x - seg.x) * 0.2;
                    seg.y += (prev.y - seg.y) * 0.2;
                  }
                  updated.pos = { ...head };
                }
                break;
              case 'fractal':
                updated.pos.y += 0.2;
                break;
              case 'sentinel':
                updated.pos.x = 160 + Math.sin(time * 0.01) * 80;
                break;
            }
            
            return updated;
          }).filter(a => a.pos.y < 600 && a.active);
          
          const newBullets: Bullet[] = [];
          const newParticles: Particle[] = [...prev.particles];
          let scoreIncrease = 0;
          
          for (const bullet of newState.bullets) {
            if (bullet.isEnemy) {
              newBullets.push(bullet);
              continue;
            }
            
            let bulletHit = false;
            
            for (const alien of newState.aliens) {
              if (!alien.active) continue;
              
              const hitBox = alien.type === 'sentinel' && alien.shields && alien.shields > 0
                ? { x: alien.pos.x - 10, y: alien.pos.y - 10, w: alien.size.x + 20, h: alien.size.y + 20 }
                : { x: alien.pos.x, y: alien.pos.y, w: alien.size.x, h: alien.size.y };
              
              if (
                bullet.pos.x < hitBox.x + hitBox.w &&
                bullet.pos.x + bullet.size.x > hitBox.x &&
                bullet.pos.y < hitBox.y + hitBox.h &&
                bullet.pos.y + bullet.size.y > hitBox.y
              ) {
                bulletHit = true;
                
                if (alien.type === 'sentinel' && alien.shields && alien.shields > 0) {
                  alien.shields--;
                } else {
                  alien.health--;
                  if (alien.health <= 0) {
                    alien.active = false;
                    scoreIncrease += alien.points;
                    
                    for (let i = 0; i < 8; i++) {
                      newParticles.push({
                        pos: { x: alien.pos.x + alien.size.x / 2, y: alien.pos.y + alien.size.y / 2 },
                        vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 },
                        life: 30,
                        maxLife: 30,
                        color: alien.type === 'glitch' ? '#ff00ff' : alien.type === 'jelly' ? '#8b00ff' : '#00ffff',
                        size: 4,
                      });
                    }
                    
                    if (alien.type === 'fractal' && alien.points === 100) {
                      for (let i = 0; i < 3; i++) {
                        const angle = (Math.PI * 2 / 3) * i;
                        newState.aliens.push({
                          pos: { x: alien.pos.x + 20, y: alien.pos.y + 20 },
                          vel: { x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 + 1 },
                          size: { x: 20, y: 20 },
                          active: true,
                          type: 'fractal',
                          health: 1,
                          points: 25,
                          phase: i,
                        });
                      }
                    }
                  }
                }
                break;
              }
            }
            
            if (!bulletHit) {
              newBullets.push(bullet);
            }
          }
          
          newState.bullets = newBullets;
          newState.score += scoreIncrease;
          newState.combatScore += scoreIncrease;
          newState.particles = newParticles
            .map(p => ({ ...p, pos: { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y }, life: p.life - 1 }))
            .filter(p => p.life > 0);
          newState.aliens = newState.aliens.filter(a => a.active);
          
          for (const alien of newState.aliens) {
            if (
              alien.pos.y + alien.size.y > prev.player.pos.y &&
              alien.pos.x < prev.player.pos.x + prev.player.size.x &&
              alien.pos.x + alien.size.x > prev.player.pos.x
            ) {
              newState.lives--;
              if (newState.lives <= 0) {
                newState.phase = 'gameover';
                newState.gameOver = true;
              } else {
                newState.player.pos = { x: 180, y: 520 };
                newState.aliens = spawnAliens(newState.level, newState.wave);
              }
              break;
            }
          }
          
          if (newState.aliens.length === 0 && !newState.levelComplete) {
            if (newState.wave < 3) {
              newState.wave++;
              newState.aliens = spawnAliens(newState.level, newState.wave);
            } else {
              newState.levelComplete = true;
            }
          }
          
        } else if (prev.phase === 'lander') {
          const { GRAVITY, THRUST_POWER, STRAFE_POWER, MAX_VELOCITY, FUEL_BURN_RATE } = LANDER_CONFIG;
          
          newState.player.vel.y += GRAVITY;
          
          const thrusting = (keys.has(' ') || keys.has('ArrowUp') || touch.up) && prev.player.fuel > 0;
          if (thrusting) {
            newState.player.vel.y -= THRUST_POWER;
            newState.player.fuel -= FUEL_BURN_RATE;
            newState.thrusting = true;
            
            for (let i = 0; i < 2; i++) {
              newState.particles.push({
                pos: { x: prev.player.pos.x + prev.player.size.x / 2, y: prev.player.pos.y + prev.player.size.y },
                vel: { x: (Math.random() - 0.5) * 2, y: Math.random() * 3 + 2 },
                life: 20,
                maxLife: 20,
                color: Math.random() > 0.5 ? '#ff8800' : '#ffff00',
                size: 3,
              });
            }
          } else {
            newState.thrusting = false;
          }
          
          if ((keys.has('ArrowLeft') || keys.has('a') || touch.left) && prev.player.fuel > 0) {
            newState.player.vel.x -= STRAFE_POWER;
            newState.player.fuel -= FUEL_BURN_RATE * 0.3;
          }
          if ((keys.has('ArrowRight') || keys.has('d') || touch.right) && prev.player.fuel > 0) {
            newState.player.vel.x += STRAFE_POWER;
            newState.player.fuel -= FUEL_BURN_RATE * 0.3;
          }
          
          const speed = Math.sqrt(newState.player.vel.x ** 2 + newState.player.vel.y ** 2);
          if (speed > MAX_VELOCITY) {
            const scale = MAX_VELOCITY / speed;
            newState.player.vel.x *= scale;
            newState.player.vel.y *= scale;
          }
          
          newState.player.pos.x += newState.player.vel.x;
          newState.player.pos.y += newState.player.vel.y;
          newState.player.pos.x = Math.max(30, Math.min(350, newState.player.pos.x));
          newState.player.fuel = Math.max(0, newState.player.fuel);
          
          newState.particles = prev.particles
            .map(p => ({ ...p, pos: { x: p.pos.x + p.vel.x, y: p.pos.y + p.vel.y }, life: p.life - 1 }))
            .filter(p => p.life > 0);
          
          const groundY = 520;
          const padX = 140;
          const padWidth = 120;
          
          if (newState.player.pos.y + newState.player.size.y >= groundY) {
            const onPad = newState.player.pos.x >= padX - 10 && 
                         newState.player.pos.x + newState.player.size.x <= padX + padWidth + 10;
            const landingSpeed = Math.abs(newState.player.vel.y);
            
            newState.landingVelocity = landingSpeed;
            
            if (onPad && landingSpeed < LANDER_CONFIG.SAFE_LANDING_VELOCITY) {
              newState.player.vel = { x: 0, y: 0 };
              newState.player.pos.y = groundY - newState.player.size.y;
              
              if (landingSpeed < LANDER_CONFIG.PERFECT_LANDING_VELOCITY) {
                newState.landingBonus = 500;
              } else {
                newState.landingBonus = 200;
              }
              
              newState.score += newState.landingBonus + newState.lives * 100;
              newState.phase = 'revelation';
            } else {
              newState.lives--;
              if (newState.lives <= 0) {
                newState.phase = 'gameover';
                newState.gameOver = true;
              } else {
                newState.player.pos = { x: 180, y: 50 };
                newState.player.vel = { x: 0, y: 0 };
                newState.player.fuel = 100;
              }
            }
          }
          
          if (newState.player.pos.y > 400) {
            const terrainLeft = 50 + Math.sin(newState.player.pos.y * 0.02) * 20;
            const terrainRight = 350 - Math.sin(newState.player.pos.y * 0.02 + 1) * 20;
            
            if (newState.player.pos.x < terrainLeft || newState.player.pos.x + newState.player.size.x > terrainRight) {
              newState.lives--;
              if (newState.lives <= 0) {
                newState.phase = 'gameover';
                newState.gameOver = true;
              } else {
                newState.player.pos = { x: 180, y: 50 };
                newState.player.vel = { x: 0, y: 0 };
                newState.player.fuel = 100;
              }
            }
          }
        }
        
        return newState;
      });
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.phase, isPaused, spawnAliens]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const render = () => {
      ctx.save();
      ctx.scale(scale, scale);
      
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, 400, 600);
      
      for (let i = 0; i < 60; i++) {
        const x = (i * 73 + timeRef.current * 0.05) % 400;
        const y = (i * 137) % 600;
        const brightness = 0.3 + Math.sin(timeRef.current * 0.02 + i) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(x, y, 1, 1);
      }
      
      if (gameState.phase === 'lander') {
        ctx.fillStyle = '#2a0040';
        ctx.beginPath();
        ctx.moveTo(0, 600);
        ctx.lineTo(0, 450);
        for (let x = 0; x <= 400; x += 15) {
          const y = 450 + Math.sin(x * 0.03) * 30 + Math.sin(x * 0.07) * 15;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(400, 600);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#4a0080';
        ctx.beginPath();
        ctx.moveTo(0, 600);
        ctx.lineTo(0, 520);
        ctx.lineTo(130, 520);
        ctx.lineTo(130, 530);
        ctx.lineTo(270, 530);
        ctx.lineTo(270, 520);
        ctx.lineTo(400, 520);
        ctx.lineTo(400, 600);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(140, 520, 120, 10);
        
        const pulseSpeed = 0.05 + (1 - (520 - gameState.player.pos.y) / 500) * 0.1;
        const pulse = Math.sin(timeRef.current * pulseSpeed) > 0;
        ctx.fillStyle = pulse ? '#00ff00' : '#004400';
        ctx.beginPath();
        ctx.arc(150, 525, 4, 0, Math.PI * 2);
        ctx.arc(200, 525, 4, 0, Math.PI * 2);
        ctx.arc(250, 525, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#00ffff20';
        for (let i = 0; i < 6; i++) {
          const cx = 20 + i * 70;
          if (cx < 130 || cx > 270) {
            const cy = 510 - Math.abs(Math.sin(i * 1.5)) * 10;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - 4, cy + 12);
            ctx.lineTo(cx + 4, cy + 12);
            ctx.closePath();
            ctx.fill();
          }
        }
        
        const velColor = Math.abs(gameState.player.vel.y) < 1 ? '#00ff00' : 
                        Math.abs(gameState.player.vel.y) < 2 ? '#ffff00' : '#ff0000';
        ctx.fillStyle = velColor;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`VEL: ${Math.abs(gameState.player.vel.y).toFixed(1)}`, 10, 80);
        
        ctx.fillStyle = gameState.player.fuel > 30 ? '#00ffff' : '#ff4444';
        ctx.fillText(`FUEL: ${Math.floor(gameState.player.fuel)}%`, 10, 100);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(10, 105, 80, 8);
        ctx.fillStyle = gameState.player.fuel > 30 ? '#00ffff' : '#ff4444';
        ctx.fillRect(10, 105, gameState.player.fuel * 0.8, 8);
      }
      
      for (const particle of gameState.particles) {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(particle.pos.x, particle.pos.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      
      for (const alien of gameState.aliens) {
        const { x, y } = alien.pos;
        const time = timeRef.current;
        
        switch (alien.type) {
          case 'glitch':
            const glitchOffset = Math.sin(time * 0.1 + alien.phase) * 3;
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(x + glitchOffset, y, 24, 24);
            ctx.fillStyle = '#00ffff';
            if (Math.random() > 0.7) {
              ctx.fillRect(x - 4 + glitchOffset, y + 8, 8, 4);
              ctx.fillRect(x + 20 + glitchOffset, y + 12, 8, 4);
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 6 + glitchOffset, y + 8, 4, 4);
            ctx.fillRect(x + 14 + glitchOffset, y + 8, 4, 4);
            break;
            
          case 'jelly':
            const pulse = Math.sin(time * 0.05 + alien.phase) * 0.3 + 1;
            ctx.fillStyle = 'rgba(139, 0, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(x + 15, y + 12, 15 * pulse, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              const tentX = x + 5 + i * 10;
              ctx.beginPath();
              ctx.moveTo(tentX, y + 12);
              for (let j = 1; j <= 4; j++) {
                const wave = Math.sin(time * 0.08 + alien.phase + i + j * 0.5) * 5;
                ctx.lineTo(tentX + wave, y + 12 + j * 8);
              }
              ctx.stroke();
            }
            break;
            
          case 'serpent':
            if (alien.segments) {
              ctx.strokeStyle = '#00ff8880';
              ctx.lineWidth = 3;
              ctx.beginPath();
              alien.segments.forEach((seg, i) => {
                if (i === 0) ctx.moveTo(seg.x, seg.y);
                else ctx.lineTo(seg.x, seg.y);
              });
              ctx.stroke();
              
              alien.segments.forEach((seg, i) => {
                const isHead = i === 0;
                const size = isHead ? 18 : 14;
                ctx.fillStyle = '#00ff88';
                ctx.beginPath();
                ctx.arc(seg.x, seg.y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                if (isHead) {
                  ctx.fillStyle = '#ff0000';
                  ctx.beginPath();
                  ctx.arc(seg.x - 4, seg.y - 2, 3, 0, Math.PI * 2);
                  ctx.arc(seg.x + 4, seg.y - 2, 3, 0, Math.PI * 2);
                  ctx.fill();
                }
              });
            }
            break;
            
          case 'fractal':
            ctx.save();
            ctx.translate(x + 20, y + 20);
            ctx.rotate(time * 0.02 + alien.phase);
            const size = alien.health > 1 ? 20 : 12;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const px = size * Math.cos(angle);
              const py = size * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = `rgba(191, 0, 255, ${Math.sin(time * 0.1) * 0.2 + 0.6})`;
            ctx.fill();
            ctx.restore();
            break;
            
          case 'sentinel':
            const blink = Math.sin(time * 0.03) > 0.9;
            if (alien.shields) {
              for (let i = 0; i < alien.shields; i++) {
                const angle = (time * 0.03) + (Math.PI * 2 / 4) * i;
                const shieldX = x + 40 + Math.cos(angle) * 50;
                const shieldY = y + 40 + Math.sin(angle) * 35;
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(shieldX, shieldY, 12, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            ctx.fillStyle = '#1a0030';
            ctx.beginPath();
            ctx.ellipse(x + 40, y + 40, 35, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            if (!blink) {
              ctx.fillStyle = '#ff0000';
              ctx.beginPath();
              ctx.arc(x + 40, y + 40, 20, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#000000';
              ctx.beginPath();
              ctx.arc(x + 40, y + 40, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(x + 34, y + 34, 4, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.strokeStyle = '#ff0000';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(x + 10, y + 40);
              ctx.lineTo(x + 70, y + 40);
              ctx.stroke();
            }
            break;
        }
      }
      
      for (const bullet of gameState.bullets) {
        if (!bullet.isEnemy) {
          ctx.fillStyle = '#00ffff';
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 10;
          ctx.fillRect(bullet.pos.x, bullet.pos.y, bullet.size.x, bullet.size.y);
          ctx.shadowBlur = 0;
        }
      }
      
      if (gameState.player.active && (gameState.phase === 'shooter' || gameState.phase === 'lander')) {
        const { x, y } = gameState.player.pos;
        
        if (gameState.thrusting && gameState.phase === 'lander') {
          ctx.fillStyle = '#ff8800';
          ctx.beginPath();
          ctx.moveTo(x + 15, y + 60);
          ctx.lineTo(x + 25, y + 60);
          ctx.lineTo(x + 20, y + 75 + Math.random() * 10);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.moveTo(x + 17, y + 60);
          ctx.lineTo(x + 23, y + 60);
          ctx.lineTo(x + 20, y + 68 + Math.random() * 5);
          ctx.closePath();
          ctx.fill();
        }
        
        if (rocketImgRef.current) {
          ctx.drawImage(rocketImgRef.current, x, y, 40, 60);
        } else {
          ctx.fillStyle = '#00ffff';
          ctx.beginPath();
          ctx.moveTo(x + 20, y);
          ctx.lineTo(x + 35, y + 45);
          ctx.lineTo(x + 5, y + 45);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#bf00ff';
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 45);
          ctx.lineTo(x, y + 60);
          ctx.lineTo(x + 15, y + 50);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x + 35, y + 45);
          ctx.lineTo(x + 40, y + 60);
          ctx.lineTo(x + 25, y + 50);
          ctx.closePath();
          ctx.fill();
        }
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Orbitron", monospace';
      ctx.fillText(`SCORE: ${gameState.score}`, 10, 25);
      
      ctx.fillStyle = '#ff4444';
      ctx.fillText(`LIVES: ${'❤️'.repeat(gameState.lives)}`, 10, 50);
      
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 14px "Orbitron", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`LEVEL ${gameState.level}`, 390, 25);
      if (gameState.phase === 'shooter') {
        ctx.fillText(`WAVE ${gameState.wave}/3`, 390, 45);
      }
      ctx.textAlign = 'left';
      
      ctx.restore();
    };
    
    const renderLoop = () => {
      render();
      requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
  }, [gameState, scale]);
  
  useEffect(() => {
    if (gameState.phase === 'revelation') {
      const newLifetime = lifetimeScore + gameState.score;
      setLifetimeScore(newLifetime);
      localStorage.setItem('guardian_lifetime_score', newLifetime.toString());
    }
  }, [gameState.phase]);
  
  const rank = useMemo(() => getRank(lifetimeScore + (gameState.phase === 'revelation' ? gameState.score : 0)), [lifetimeScore, gameState.phase, gameState.score]);
  
  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Command Center
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white/60 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 via-white to-purple-400 bg-clip-text text-transparent">
            GUARDIAN DEFENDER
          </h1>
          <p className="text-xs text-white/50 font-mono mt-1">THE BASED ODYSSEY</p>
        </div>
        
        <div className="relative mx-auto" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="rounded-xl border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]"
            style={{ touchAction: 'none' }}
          />
          
          <AnimatePresence>
            {gameState.phase === 'menu' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl"
              >
                <Gamepad2 className="w-16 h-16 text-cyan-400 mb-4" />
                <h2 className="text-xl font-orbitron font-bold text-white mb-2">READY GUARDIAN?</h2>
                <p className="text-sm text-white/60 mb-6 text-center px-4">
                  Defend the galaxy through 5 levels of combat and land safely on the Based Outpost
                </p>
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-orbitron font-bold px-8 py-3 text-lg hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
                  data-testid="button-start-game"
                >
                  <Play className="w-5 h-5 mr-2" />
                  START MISSION
                </Button>
                
                <div className="mt-6 text-xs text-white/40 text-center">
                  <p>Controls: Arrow Keys / WASD to move</p>
                  <p>Space to shoot/thrust</p>
                </div>
                
                <div className="mt-4 px-4 py-2 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/60">
                    Lifetime Score: <span className="text-cyan-400 font-bold">{lifetimeScore.toLocaleString()}</span>
                  </p>
                  <p className="text-xs" style={{ color: rank.color }}>
                    Rank: {rank.title}
                  </p>
                </div>
              </motion.div>
            )}
            
            {gameState.levelComplete && gameState.phase === 'shooter' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl"
              >
                <h2 className="text-2xl font-orbitron font-bold text-cyan-400 mb-4">LEVEL COMPLETE!</h2>
                <p className="text-lg text-white mb-6">Score: {gameState.score}</p>
                <Button
                  onClick={nextLevel}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-orbitron font-bold px-6 py-2"
                  data-testid="button-next-level"
                >
                  {gameState.level < 4 ? 'NEXT LEVEL' : 'FINAL DESCENT'}
                </Button>
              </motion.div>
            )}
            
            {gameState.phase === 'revelation' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-xl p-6 text-center"
              >
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-xl font-orbitron font-bold text-cyan-400 mb-2">
                    TRANSMISSION RECEIVED
                  </h2>
                </motion.div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-sm text-white/80 mb-4"
                >
                  Guardian, you've crossed the void and touched down on the Based Outpost.
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="bg-white/5 rounded-lg p-4 mb-4 w-full"
                >
                  <p className="text-xs text-white/60 mb-2">MISSION REPORT</p>
                  <div className="space-y-1 text-sm">
                    <p>Combat Score: <span className="text-cyan-400">{gameState.combatScore}</span></p>
                    <p>Survival Bonus: <span className="text-green-400">+{gameState.lives * 100}</span></p>
                    <p>Landing Bonus: <span className="text-yellow-400">+{gameState.landingBonus}</span></p>
                    <p className="text-lg font-bold border-t border-white/10 pt-2 mt-2">
                      TOTAL: <span className="text-cyan-400">{gameState.score}</span>
                    </p>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="mb-4"
                >
                  <p className="text-xs text-white/60">Lifetime Score: {(lifetimeScore + gameState.score).toLocaleString()}</p>
                  <p className="text-lg font-bold" style={{ color: rank.color }}>
                    RANK: {rank.title}
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                  className="flex gap-3"
                >
                  <Button
                    onClick={startGame}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-orbitron"
                    data-testid="button-play-again"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    PLAY AGAIN
                  </Button>
                </motion.div>
              </motion.div>
            )}
            
            {gameState.phase === 'gameover' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-xl"
              >
                <h2 className="text-2xl font-orbitron font-bold text-red-500 mb-4">MISSION FAILED</h2>
                <p className="text-white/60 mb-2">Final Score: {gameState.score}</p>
                <p className="text-white/40 text-sm mb-6">Level {gameState.level} - Wave {gameState.wave}</p>
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-orbitron"
                  data-testid="button-try-again"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  TRY AGAIN
                </Button>
              </motion.div>
            )}
            
            {isPaused && gameState.phase !== 'menu' && gameState.phase !== 'revelation' && gameState.phase !== 'gameover' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl"
              >
                <Pause className="w-12 h-12 text-white/50 mb-4" />
                <h2 className="text-xl font-orbitron font-bold text-white mb-4">PAUSED</h2>
                <Button
                  onClick={() => setIsPaused(false)}
                  className="bg-cyan-500 text-black font-orbitron"
                >
                  <Play className="w-4 h-4 mr-2" />
                  RESUME
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {(gameState.phase === 'shooter' || gameState.phase === 'lander') && (
          <div className="mt-4 grid grid-cols-3 gap-2 md:hidden">
            <Button
              variant="outline"
              className="h-16 text-2xl border-cyan-500/50 bg-cyan-500/10 active:bg-cyan-500/30"
              onTouchStart={() => handleTouchStart('left')}
              onTouchEnd={() => handleTouchEnd('left')}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={() => handleTouchEnd('left')}
              onMouseLeave={() => handleTouchEnd('left')}
            >
              ◀
            </Button>
            <Button
              variant="outline"
              className="h-16 text-xl border-purple-500/50 bg-purple-500/10 active:bg-purple-500/30 font-orbitron"
              onTouchStart={() => handleTouchStart(gameState.phase === 'lander' ? 'up' : 'fire')}
              onTouchEnd={() => handleTouchEnd(gameState.phase === 'lander' ? 'up' : 'fire')}
              onMouseDown={() => handleTouchStart(gameState.phase === 'lander' ? 'up' : 'fire')}
              onMouseUp={() => handleTouchEnd(gameState.phase === 'lander' ? 'up' : 'fire')}
              onMouseLeave={() => handleTouchEnd(gameState.phase === 'lander' ? 'up' : 'fire')}
            >
              {gameState.phase === 'lander' ? '🔥' : '🔫'}
            </Button>
            <Button
              variant="outline"
              className="h-16 text-2xl border-cyan-500/50 bg-cyan-500/10 active:bg-cyan-500/30"
              onTouchStart={() => handleTouchStart('right')}
              onTouchEnd={() => handleTouchEnd('right')}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={() => handleTouchEnd('right')}
              onMouseLeave={() => handleTouchEnd('right')}
            >
              ▶
            </Button>
          </div>
        )}
        
        <div className="mt-6 text-center text-xs text-white/40">
          <p>Desktop: Arrow Keys to move, Space to shoot/thrust, P to pause</p>
          <p className="md:hidden mt-1">Mobile: Use buttons below the game</p>
        </div>
      </div>
    </div>
  );
}
