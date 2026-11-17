/**
 * PROCEDURAL AUDIO SYNTHESIZER (WEB AUDIO API)
 * Zero external asset dependencies - instant, lag-free procedural sound effects
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Continuous sound nodes
    this.fistOsc1 = null;
    this.fistOsc2 = null;
    this.fistGain = null;

    this.blackHoleOsc = null;
    this.blackHoleSub = null;
    this.blackHoleNoise = null;
    this.blackHoleGain = null;

    this.auraTargetVol = 0;
    this.blackHoleTargetVol = 0;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initContinuousNodes();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio init skipped or unavailable:', e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  initContinuousNodes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // --- Fist Aura Ambient Synthesizer ---
    this.fistGain = this.ctx.createGain();
    this.fistGain.gain.setValueAtTime(0.0001, now);

    const fistFilter = this.ctx.createBiquadFilter();
    fistFilter.type = 'lowpass';
    fistFilter.frequency.setValueAtTime(350, now);
    fistFilter.Q.setValueAtTime(4.0, now);

    this.fistOsc1 = this.ctx.createOscillator();
    this.fistOsc1.type = 'sawtooth';
    this.fistOsc1.frequency.setValueAtTime(92.5, now); // F#2

    this.fistOsc2 = this.ctx.createOscillator();
    this.fistOsc2.type = 'sine';
    this.fistOsc2.frequency.setValueAtTime(138.6, now); // C#3

    this.fistOsc1.connect(fistFilter);
    this.fistOsc2.connect(fistFilter);
    fistFilter.connect(this.fistGain);
    this.fistGain.connect(this.masterGain);

    this.fistOsc1.start();
    this.fistOsc2.start();

    // --- Black Hole Gravitational Drone Synthesizer ---
    this.blackHoleGain = this.ctx.createGain();
    this.blackHoleGain.gain.setValueAtTime(0.0001, now);

    const bhFilter = this.ctx.createBiquadFilter();
    bhFilter.type = 'bandpass';
    bhFilter.frequency.setValueAtTime(75, now);
    bhFilter.Q.setValueAtTime(2.5, now);

    this.blackHoleSub = this.ctx.createOscillator();
    this.blackHoleSub.type = 'triangle';
    this.blackHoleSub.frequency.setValueAtTime(45, now);

    this.blackHoleOsc = this.ctx.createOscillator();
    this.blackHoleOsc.type = 'sawtooth';
    this.blackHoleOsc.frequency.setValueAtTime(60, now);

    // Create pink noise buffer for accretion disk wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.25;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.blackHoleSub.connect(bhFilter);
    this.blackHoleOsc.connect(bhFilter);
    noiseSource.connect(bhFilter);
    bhFilter.connect(this.blackHoleGain);
    this.blackHoleGain.connect(this.masterGain);

    this.blackHoleSub.start();
    this.blackHoleOsc.start();
    noiseSource.start();
  }

  // Update continuous volumes smoothly without clicks
  updateContinuousAura(intensity) {
    if (!this.ctx || !this.fistGain || this.isMuted) return;
    const target = Math.min(Math.max(intensity, 0), 1) * 0.25;
    this.fistGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  updateContinuousBlackHole(intensity) {
    if (!this.ctx || !this.blackHoleGain || this.isMuted) return;
    const target = Math.min(Math.max(intensity, 0), 1) * 0.35;
    this.blackHoleGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }

  // Play Shotgun Blast with sub-bass kick, noise snap, and metallic reverb
  playShotgunBlast() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. Heavy Sub-Bass Boom (Kick punch)
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(180, now);
    kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    kickGain.gain.setValueAtTime(0.8, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    kickOsc.connect(kickGain);
    kickGain.connect(this.masterGain);
    kickOsc.start(now);
    kickOsc.stop(now + 0.45);

    // 2. Gunpowder explosion crackle (noise burst)
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.3), this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(3200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(400, now + 0.25);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(now);

    // 3. Pump action "ch-chak" after 0.28s
    setTimeout(() => {
      this.playShotgunPump();
    }, 280);

    // 4. Spent brass shell clink after 0.5s
    setTimeout(() => {
      this.playShellClink();
    }, 520);
  }

  // Shotgun pump action rack sound (mechanical slide)
  playShotgunPump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Pump slide backward
    this.playMetalClick(now, 1200, 0.04);
    // Pump slide forward
    this.playMetalClick(now + 0.12, 1450, 0.05);
  }

  playMetalClick(time, freq, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + dur);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  // Brass shell casing bouncing on floor
  playShellClink() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const baseFreq = 2400 + Math.random() * 400;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Mystic fist power-up burst
  playFistSummon() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  // Black hole spawn warp burst
  playBlackHoleSpawn() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.5);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Target destroyed / explosion
  playTargetHit() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // High hit ping
    const ping = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(950, now);
    ping.frequency.exponentialRampToValueAtTime(450, now + 0.12);

    pingGain.gain.setValueAtTime(0.35, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    ping.connect(pingGain);
    pingGain.connect(this.masterGain);
    ping.start(now);
    ping.stop(now + 0.15);
  }
}

export const sound = new SoundSynthesizer();
