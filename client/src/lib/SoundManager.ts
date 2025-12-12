export class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private sounds: Map<string, AudioBuffer> = new Map();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.enabled = localStorage.getItem('soundEnabled') !== 'false';
      this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.5');
      
      // Initialize AudioContext on user interaction to handle autoplay policies
      const initAudio = () => {
        if (!this.initialized) {
          this.init();
          window.removeEventListener('click', initAudio);
          window.removeEventListener('keydown', initAudio);
        }
      };

      window.addEventListener('click', initAudio);
      window.addEventListener('keydown', initAudio);
    }
  }

  private init() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', String(enabled));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', String(this.volume));
  }

  public getVolume(): number {
    return this.volume;
  }

  public play(soundName: 'click' | 'hover' | 'success' | 'error' | 'mint_success' | 'notification' | 'connect_wallet') {
    if (!this.enabled || !this.initialized || !this.audioContext) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = this.volume;

    const now = ctx.currentTime;

    switch (soundName) {
      case 'click':
        this.playClick(ctx, gainNode, now);
        this.vibrate(10);
        break;
      case 'hover':
        this.playHover(ctx, gainNode, now);
        break;
      case 'success':
        this.playSuccess(ctx, gainNode, now);
        this.vibrate([50, 50, 100]);
        break;
      case 'error':
        this.playError(ctx, gainNode, now);
        this.vibrate([100, 50, 100]);
        break;
      case 'mint_success':
        this.playMintSuccess(ctx, gainNode, now);
        this.vibrate([100, 50, 100, 50, 200]);
        break;
      case 'notification':
        this.playNotification(ctx, gainNode, now);
        break;
      case 'connect_wallet':
        this.playConnectWallet(ctx, gainNode, now);
        this.vibrate(50);
        break;
    }
  }

  private vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  // --- Sound Generators ---

  private playClick(ctx: AudioContext, gainNode: GainNode, now: number) {
    // Short, crisp high-pitch blip
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    
    gainNode.gain.setValueAtTime(this.volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playHover(ctx: AudioContext, gainNode: GainNode, now: number) {
    // Subtle high-frequency breezy tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.05, now + 0.05); // Fade in
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1); // Fade out

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playSuccess(ctx: AudioContext, gainNode: GainNode, now: number) {
    // Major chord arpeggio
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, now + i * 0.05);
      noteGain.gain.linearRampToValueAtTime(this.volume * 0.2, now + i * 0.05 + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
      
      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.5);
    });
  }

  private playError(ctx: AudioContext, gainNode: GainNode, now: number) {
    // Descending tone
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.3);

    gainNode.gain.setValueAtTime(this.volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playMintSuccess(ctx: AudioContext, gainNode: GainNode, now: number) {
    // Grand fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C Major extended
    
    // Add some reverb-like effect with multiple oscillators slightly detuned
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square'; // More retro/8-bit sounding
      osc.frequency.value = freq;
      
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.1 + (i * 0.05));
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      
      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.start(now);
      osc.stop(now + 2.5);
    });
  }

  private playNotification(ctx: AudioContext, gainNode: GainNode, now: number) {
    // Gentle bubble pop
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    gainNode.gain.setValueAtTime(this.volume * 0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playConnectWallet(ctx: AudioContext, gainNode: GainNode, now: number) {
    // Futuristic power up
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const soundManager = new SoundManager();
