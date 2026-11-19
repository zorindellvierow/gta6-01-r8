// Crescent Bay — tiny WebAudio synth sound bank. No audio files.
// The AudioContext is created lazily on the first sound (i.e. after a user
// gesture) and every method is a no-op when AudioContext is unavailable
// (Node smoke test) or when muted.

// Resolve the constructor without touching `window` at module load time.
function audioContextClass() {
  if (typeof window !== 'undefined' && window.AudioContext) return window.AudioContext;
  if (typeof window !== 'undefined' && window.webkitAudioContext) return window.webkitAudioContext;
  if (typeof globalThis !== 'undefined' && globalThis.AudioContext) return globalThis.AudioContext;
  return null;
}

export class SoundBank {
  constructor() {
    this.muted = false;
    this._ctx = null;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  // Lazily build (or reuse) the context. Null when unsupported.
  _ensure() {
    if (this.muted) return null;
    if (this._ctx) {
      if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
      return this._ctx;
    }
    const Ctor = audioContextClass();
    if (!Ctor) return null;
    try {
      this._ctx = new Ctor();
    } catch (_err) {
      this._ctx = null;
    }
    return this._ctx;
  }

  // Short oscillator blip with a pitch slide and exponential decay.
  _tone(freqFrom, freqTo, duration, type, volume, delay = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqFrom, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + duration);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch (_err) {
      // Audio must never break gameplay.
    }
  }

  // Short burst of filtered noise (gunshots, impacts).
  _noise(duration, volume, delay = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(t0);
    } catch (_err) {
      // Audio must never break gameplay.
    }
  }

  shoot() {
    this._noise(0.09, 0.25);
    this._tone(220, 60, 0.08, 'square', 0.12);
  }

  pickup() {
    this._tone(660, 660, 0.07, 'sine', 0.18);
    this._tone(990, 990, 0.09, 'sine', 0.18, 0.07);
  }

  missionComplete() {
    this._tone(523, 523, 0.12, 'triangle', 0.2);
    this._tone(659, 659, 0.12, 'triangle', 0.2, 0.11);
    this._tone(784, 784, 0.22, 'triangle', 0.22, 0.22);
  }

  busted() {
    this._tone(392, 196, 0.5, 'sawtooth', 0.16);
  }

  wasted() {
    this._tone(220, 55, 0.8, 'sawtooth', 0.18);
  }

  click() {
    this._tone(880, 880, 0.04, 'sine', 0.12);
  }

  engineStart() {
    this._tone(70, 160, 0.5, 'sawtooth', 0.1);
    this._noise(0.25, 0.06);
  }
}
