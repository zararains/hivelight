// Every sound in Hivelight is synthesized with WebAudio: no audio files, no
// network. Short oscillator voices make the effects, and a slow pentatonic
// pluck pattern over a soft bass makes the meadow music. The context is
// created lazily and unlocked by the player's first key or click, as
// browsers require.

const MELODY = [0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 12, 9, 7, 4, 2];
const ROOT_HZ = 262; // C4; melody steps are semitone offsets from it.

export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Safe to call on every gesture; only the first call builds the graph.
  unlock() {
    try {
      if (!this.context) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        this.context = new AudioCtor();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.6;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') {
        this.context.resume();
      }
    } catch (error) {
      this.context = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setValueAtTime(muted ? 0 : 0.6, this.context.currentTime);
    }
  }

  // One enveloped oscillator voice. type, from and to are frequencies in Hz.
  tone({ type = 'sine', from = 440, to = from, seconds = 0.15, volume = 0.2, delay = 0 }) {
    if (!this.context || !this.master) return;
    try {
      const start = this.context.currentTime + delay;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + seconds);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch (error) {
      // A failed voice is silence, never a crash.
    }
  }

  // A burst of filtered noise, for the dash whoosh and the sting buzz.
  noise({ seconds = 0.2, volume = 0.15, delay = 0, from = 900, to = 300 }) {
    if (!this.context || !this.master) return;
    try {
      const start = this.context.currentTime + delay;
      const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(from, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + seconds);
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(start);
    } catch (error) {
      // Silence, as above.
    }
  }

  click() {
    this.tone({ type: 'triangle', from: 660, to: 520, seconds: 0.07, volume: 0.12 });
  }

  pickup(golden) {
    const base = golden ? 880 : 620;
    this.tone({ type: 'sine', from: base, to: base * 1.5, seconds: 0.12, volume: 0.18 });
    this.tone({ type: 'sine', from: base * 2, to: base * 2.4, seconds: 0.1, volume: 0.07, delay: 0.03 });
  }

  deposit(units) {
    for (let i = 0; i < Math.min(units, 5); i += 1) {
      const step = [0, 4, 7, 12, 16][i];
      this.tone({
        type: 'triangle',
        from: ROOT_HZ * Math.pow(2, step / 12),
        seconds: 0.16,
        volume: 0.14,
        delay: i * 0.05,
      });
    }
  }

  dash() {
    this.noise({ seconds: 0.22, volume: 0.1, from: 500, to: 1800 });
  }

  sting() {
    this.tone({ type: 'sawtooth', from: 320, to: 70, seconds: 0.35, volume: 0.22 });
    this.noise({ seconds: 0.3, volume: 0.16, from: 2400, to: 500 });
  }

  full() {
    this.tone({ type: 'square', from: 520, seconds: 0.06, volume: 0.06 });
    this.tone({ type: 'square', from: 520, seconds: 0.06, volume: 0.06, delay: 0.09 });
  }

  win() {
    const steps = [0, 4, 7, 12, 16, 19, 24];
    steps.forEach((step, i) => {
      this.tone({
        type: 'triangle',
        from: ROOT_HZ * Math.pow(2, step / 12),
        seconds: 0.3,
        volume: 0.16,
        delay: i * 0.11,
      });
    });
  }

  lose() {
    const steps = [7, 4, 2, 0];
    steps.forEach((step, i) => {
      this.tone({
        type: 'triangle',
        from: ROOT_HZ * Math.pow(2, step / 12),
        to: ROOT_HZ * Math.pow(2, step / 12) * 0.97,
        seconds: 0.34,
        volume: 0.15,
        delay: i * 0.16,
      });
    });
  }

  startMusic() {
    if (!this.context || this.musicTimer !== null) return;
    const tick = () => {
      if (!this.context) return;
      const step = MELODY[this.musicStep % MELODY.length];
      this.musicStep += 1;
      const hz = ROOT_HZ * 2 * Math.pow(2, step / 12);
      this.tone({ type: 'triangle', from: hz, seconds: 0.5, volume: 0.045 });
      if (this.musicStep % 8 === 0) {
        this.tone({ type: 'sine', from: ROOT_HZ / 2, seconds: 1.4, volume: 0.05 });
      }
    };
    tick();
    this.musicTimer = window.setInterval(tick, 430);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
