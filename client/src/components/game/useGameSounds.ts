import { useCallback, useRef, useEffect, useState } from 'react';

type SoundType = 
  | 'score'      // Small point gain
  | 'combo'      // Combo multiplier
  | 'perfect'    // Perfect timing
  | 'miss'       // Missed/error
  | 'hit'        // Impact/collision
  | 'explosion'  // Bigger impact
  | 'powerup'    // Power-up collected
  | 'levelUp'    // Level complete
  | 'victory'    // Game won
  | 'gameOver'   // Game lost
  | 'click'      // UI click
  | 'whoosh'     // Fast movement
  | 'snap';      // Ring alignment snap

interface SoundConfig {
  frequency: number | number[];
  duration: number;
  type: OscillatorType;
  volume?: number;
  pattern?: 'single' | 'sweep' | 'sequence';
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  score: {
    frequency: 800,
    duration: 0.08,
    type: 'sine',
    volume: 0.15,
  },
  combo: {
    frequency: [400, 600, 800],
    duration: 0.1,
    type: 'sine',
    pattern: 'sequence',
    volume: 0.2,
  },
  perfect: {
    frequency: [523, 659, 784, 1047],
    duration: 0.15,
    type: 'sine',
    pattern: 'sequence',
    volume: 0.25,
  },
  miss: {
    frequency: 150,
    duration: 0.2,
    type: 'sawtooth',
    volume: 0.15,
  },
  hit: {
    frequency: 200,
    duration: 0.1,
    type: 'square',
    volume: 0.12,
  },
  explosion: {
    frequency: [150, 80],
    duration: 0.3,
    type: 'sawtooth',
    pattern: 'sweep',
    volume: 0.2,
  },
  powerup: {
    frequency: [300, 400, 500, 600, 800],
    duration: 0.1,
    type: 'sine',
    pattern: 'sequence',
    volume: 0.2,
  },
  levelUp: {
    frequency: [262, 330, 392, 523],
    duration: 0.2,
    type: 'sine',
    pattern: 'sequence',
    volume: 0.25,
  },
  victory: {
    frequency: [523, 659, 784, 1047, 1319],
    duration: 0.25,
    type: 'sine',
    pattern: 'sequence',
    volume: 0.3,
  },
  gameOver: {
    frequency: [400, 350, 300, 200],
    duration: 0.3,
    type: 'sawtooth',
    pattern: 'sequence',
    volume: 0.2,
  },
  click: {
    frequency: 600,
    duration: 0.03,
    type: 'square',
    volume: 0.1,
  },
  whoosh: {
    frequency: [800, 200],
    duration: 0.15,
    type: 'sine',
    pattern: 'sweep',
    volume: 0.1,
  },
  snap: {
    frequency: [1000, 1200],
    duration: 0.05,
    type: 'square',
    pattern: 'sequence',
    volume: 0.15,
  },
};

export function useGameSounds(initialEnabled: boolean = true, initialVolume: number = 50) {
  const [soundEnabled, setSoundEnabled] = useState(initialEnabled);
  const [volume, setVolume] = useState(initialVolume);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.connect(audioContextRef.current.destination);
        masterGainRef.current.gain.value = volume / 100;
      }
    } catch (err) {
      console.warn('[GameSounds] AudioContext not supported:', err);
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = soundEnabled ? volume / 100 : 0;
    }
  }, [volume, soundEnabled]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) return false;
    
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    if (!soundEnabled || !audioContextRef.current || !masterGainRef.current) return;
    
    const ready = await ensureAudioContext();
    if (!ready) return;

    const ctx = audioContextRef.current;
    const config = SOUND_CONFIGS[type];
    const baseVolume = (config.volume || 0.15) * (volume / 100);

    const createTone = (freq: number, startTime: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = config.type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(baseVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      
      osc.connect(gain);
      gain.connect(masterGainRef.current!);
      
      osc.start(startTime);
      osc.stop(startTime + dur);
    };

    const frequencies = Array.isArray(config.frequency) 
      ? config.frequency 
      : [config.frequency];

    const now = ctx.currentTime;

    switch (config.pattern) {
      case 'sequence':
        frequencies.forEach((freq, i) => {
          createTone(freq, now + i * config.duration * 0.8, config.duration);
        });
        break;
      
      case 'sweep':
        if (frequencies.length >= 2) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = config.type;
          osc.frequency.setValueAtTime(frequencies[0], now);
          osc.frequency.exponentialRampToValueAtTime(
            frequencies[frequencies.length - 1], 
            now + config.duration
          );
          
          gain.gain.setValueAtTime(baseVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
          
          osc.connect(gain);
          gain.connect(masterGainRef.current!);
          
          osc.start(now);
          osc.stop(now + config.duration);
        }
        break;
      
      default:
        createTone(frequencies[0], now, config.duration);
    }
  }, [soundEnabled, volume, ensureAudioContext]);

  const playScore = useCallback(() => playSound('score'), [playSound]);
  const playCombo = useCallback(() => playSound('combo'), [playSound]);
  const playPerfect = useCallback(() => playSound('perfect'), [playSound]);
  const playMiss = useCallback(() => playSound('miss'), [playSound]);
  const playHit = useCallback(() => playSound('hit'), [playSound]);
  const playExplosion = useCallback(() => playSound('explosion'), [playSound]);
  const playPowerup = useCallback(() => playSound('powerup'), [playSound]);
  const playLevelUp = useCallback(() => playSound('levelUp'), [playSound]);
  const playVictory = useCallback(() => playSound('victory'), [playSound]);
  const playGameOver = useCallback(() => playSound('gameOver'), [playSound]);
  const playClick = useCallback(() => playSound('click'), [playSound]);
  const playWhoosh = useCallback(() => playSound('whoosh'), [playSound]);
  const playSnap = useCallback(() => playSound('snap'), [playSound]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    volume,
    setVolume,
    playSound,
    playScore,
    playCombo,
    playPerfect,
    playMiss,
    playHit,
    playExplosion,
    playPowerup,
    playLevelUp,
    playVictory,
    playGameOver,
    playClick,
    playWhoosh,
    playSnap,
  };
}
