import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'arcade_audio_prefs';

interface AudioPrefs {
  masterVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

function getStoredPrefs(): AudioPrefs {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { masterVolume: 0.5, musicEnabled: true, sfxEnabled: true };
}

function savePrefs(prefs: AudioPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

type MusicLayer = 'base' | 'intensity' | 'danger' | 'victory';

interface LayerState {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  targetVolume: number;
  currentVolume: number;
}

export function useGameMusic() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const layersRef = useRef<Map<MusicLayer, LayerState>>(new Map());
  const animationRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const tempoRef = useRef(1);
  
  const [prefs, setPrefs] = useState<AudioPrefs>(getStoredPrefs);
  const [isPlaying, setIsPlaying] = useState(false);

  const initAudio = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    
    const masterGain = ctx.createGain();
    masterGain.gain.value = prefs.musicEnabled ? prefs.masterVolume : 0;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;
    
    return ctx;
  }, [prefs.masterVolume, prefs.musicEnabled]);

  const createBaseLayer = useCallback((ctx: AudioContext, masterGain: GainNode): LayerState => {
    const layerGain = ctx.createGain();
    layerGain.gain.value = 0;
    layerGain.connect(masterGain);
    
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    
    // Ambient pad - low drone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 55; // A1
    const gain1 = ctx.createGain();
    gain1.gain.value = 0.15;
    osc1.connect(gain1);
    gain1.connect(layerGain);
    oscillators.push(osc1);
    gains.push(gain1);
    
    // Ethereal shimmer
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 110; // A2
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.08;
    osc2.connect(gain2);
    gain2.connect(layerGain);
    oscillators.push(osc2);
    gains.push(gain2);
    
    // Subtle fifth harmony
    const osc3 = ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.value = 165; // E3
    const gain3 = ctx.createGain();
    gain3.gain.value = 0.05;
    osc3.connect(gain3);
    gain3.connect(layerGain);
    oscillators.push(osc3);
    gains.push(gain3);
    
    return { oscillators, gains: [layerGain, ...gains], targetVolume: 0.4, currentVolume: 0 };
  }, []);

  const createIntensityLayer = useCallback((ctx: AudioContext, masterGain: GainNode): LayerState => {
    const layerGain = ctx.createGain();
    layerGain.gain.value = 0;
    layerGain.connect(masterGain);
    
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    
    // Pulsing bass
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 82.4; // E2
    const gain1 = ctx.createGain();
    gain1.gain.value = 0.1;
    osc1.connect(gain1);
    gain1.connect(layerGain);
    oscillators.push(osc1);
    gains.push(gain1);
    
    // Rhythmic pulse modulator
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 2; // 2 Hz pulse
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(gain1.gain);
    oscillators.push(lfo);
    gains.push(lfoGain);
    
    // Driving synth
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 164.8; // E3
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.04;
    osc2.connect(gain2);
    gain2.connect(layerGain);
    oscillators.push(osc2);
    gains.push(gain2);
    
    return { oscillators, gains: [layerGain, ...gains], targetVolume: 0, currentVolume: 0 };
  }, []);

  const createDangerLayer = useCallback((ctx: AudioContext, masterGain: GainNode): LayerState => {
    const layerGain = ctx.createGain();
    layerGain.gain.value = 0;
    layerGain.connect(masterGain);
    
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    
    // Tension drone - dissonant
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 73.4; // D2
    const gain1 = ctx.createGain();
    gain1.gain.value = 0.08;
    osc1.connect(gain1);
    gain1.connect(layerGain);
    oscillators.push(osc1);
    gains.push(gain1);
    
    // Pulsing alarm
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 440; // A4
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.03;
    osc2.connect(gain2);
    gain2.connect(layerGain);
    oscillators.push(osc2);
    gains.push(gain2);
    
    // Fast LFO for urgency
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 4; // 4 Hz pulse
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain2.gain);
    oscillators.push(lfo);
    gains.push(lfoGain);
    
    return { oscillators, gains: [layerGain, ...gains], targetVolume: 0, currentVolume: 0 };
  }, []);

  const createVictoryLayer = useCallback((ctx: AudioContext, masterGain: GainNode): LayerState => {
    const layerGain = ctx.createGain();
    layerGain.gain.value = 0;
    layerGain.connect(masterGain);
    
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    
    // Major chord - triumphant
    const notes = [261.6, 329.6, 392, 523.2]; // C major with octave
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.06 / (i + 1);
      osc.connect(gain);
      gain.connect(layerGain);
      oscillators.push(osc);
      gains.push(gain);
    });
    
    return { oscillators, gains: [layerGain, ...gains], targetVolume: 0, currentVolume: 0 };
  }, []);

  const startMusic = useCallback(() => {
    if (isPlayingRef.current) return;
    
    const ctx = initAudio();
    if (ctx.state === 'suspended') ctx.resume();
    
    const masterGain = masterGainRef.current!;
    
    // Create all layers
    const baseLayer = createBaseLayer(ctx, masterGain);
    const intensityLayer = createIntensityLayer(ctx, masterGain);
    const dangerLayer = createDangerLayer(ctx, masterGain);
    const victoryLayer = createVictoryLayer(ctx, masterGain);
    
    layersRef.current.set('base', baseLayer);
    layersRef.current.set('intensity', intensityLayer);
    layersRef.current.set('danger', dangerLayer);
    layersRef.current.set('victory', victoryLayer);
    
    // Start all oscillators
    layersRef.current.forEach(layer => {
      layer.oscillators.forEach(osc => {
        try { osc.start(); } catch {}
      });
    });
    
    // Set base layer to fade in
    baseLayer.targetVolume = 0.4;
    
    // Animation loop for smooth fades
    const animate = () => {
      layersRef.current.forEach(layer => {
        const diff = layer.targetVolume - layer.currentVolume;
        if (Math.abs(diff) > 0.001) {
          layer.currentVolume += diff * 0.02; // Smooth interpolation
          if (layer.gains[0]) {
            layer.gains[0].gain.value = layer.currentVolume;
          }
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [initAudio, createBaseLayer, createIntensityLayer, createDangerLayer, createVictoryLayer]);

  const stopMusic = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    // Fade out all layers
    layersRef.current.forEach(layer => {
      layer.targetVolume = 0;
    });
    
    // Stop after fade
    setTimeout(() => {
      layersRef.current.forEach(layer => {
        layer.oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
      });
      layersRef.current.clear();
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      isPlayingRef.current = false;
      setIsPlaying(false);
    }, 1500);
  }, []);

  const setLayerIntensity = useCallback((layer: MusicLayer, intensity: number) => {
    const layerState = layersRef.current.get(layer);
    if (layerState) {
      layerState.targetVolume = Math.max(0, Math.min(1, intensity));
    }
  }, []);

  const setGameIntensity = useCallback((value: number) => {
    // value from 0 to 1 representing game intensity
    const clampedValue = Math.max(0, Math.min(1, value));
    
    // Base always at moderate level
    setLayerIntensity('base', 0.3 + clampedValue * 0.2);
    
    // Intensity layer builds with action
    setLayerIntensity('intensity', clampedValue * 0.5);
    
    // Update LFO frequencies based on intensity/tempo
    const intensityLayer = layersRef.current.get('intensity');
    if (intensityLayer && audioContextRef.current) {
      const lfo = intensityLayer.oscillators[1];
      if (lfo) {
        lfo.frequency.value = 2 + clampedValue * 4; // 2-6 Hz
      }
    }
  }, [setLayerIntensity]);

  const setDanger = useCallback((isDanger: boolean, urgency: number = 0.5) => {
    const dangerLayer = layersRef.current.get('danger');
    if (dangerLayer) {
      dangerLayer.targetVolume = isDanger ? 0.3 + urgency * 0.3 : 0;
      
      // Speed up danger pulse with urgency
      if (dangerLayer.oscillators[2]) {
        dangerLayer.oscillators[2].frequency.value = 4 + urgency * 6; // 4-10 Hz
      }
    }
  }, []);

  const triggerVictory = useCallback(() => {
    const victoryLayer = layersRef.current.get('victory');
    if (victoryLayer) {
      victoryLayer.targetVolume = 0.5;
      
      // Fade out after 2 seconds
      setTimeout(() => {
        if (victoryLayer) {
          victoryLayer.targetVolume = 0;
        }
      }, 2000);
    }
  }, []);

  const setTempo = useCallback((multiplier: number) => {
    tempoRef.current = multiplier;
    
    // Adjust all rhythmic elements
    layersRef.current.forEach((layer, name) => {
      if (name === 'intensity') {
        layer.oscillators.forEach((osc, i) => {
          if (i === 1) { // LFO
            osc.frequency.value = 2 * multiplier;
          }
        });
      }
    });
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    const newPrefs = { ...prefs, masterVolume: volume };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
    
    if (masterGainRef.current && prefs.musicEnabled) {
      masterGainRef.current.gain.value = volume;
    }
  }, [prefs]);

  const setMusicEnabled = useCallback((enabled: boolean) => {
    const newPrefs = { ...prefs, musicEnabled: enabled };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
    
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = enabled ? prefs.masterVolume : 0;
    }
  }, [prefs]);

  const setSfxEnabled = useCallback((enabled: boolean) => {
    const newPrefs = { ...prefs, sfxEnabled: enabled };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
  }, [prefs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      layersRef.current.forEach(layer => {
        layer.oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    startMusic,
    stopMusic,
    isPlaying,
    setGameIntensity,
    setDanger,
    triggerVictory,
    setTempo,
    prefs,
    setMasterVolume,
    setMusicEnabled,
    setSfxEnabled,
  };
}
