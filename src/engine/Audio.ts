export class AudioSystem {
  private static ctx: AudioContext | null = null;
  private static isMuted = false;
  
  // Running sound nodes
  private static slideNoise: AudioBufferSourceNode | null = null;
  private static slideGain: GainNode | null = null;
  private static slideFilter: BiquadFilterNode | null = null;

  private static carveNoise: AudioBufferSourceNode | null = null;
  private static carveGain: GainNode | null = null;
  private static carveFilter: BiquadFilterNode | null = null;

  /**
   * Initializes the AudioContext on user interaction to comply with browser autoplay policies.
   */
  public static init(): void {
    if (typeof window === 'undefined') return;
    if (this.ctx) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.error('Web Audio API not supported in this browser:', e);
    }
  }

  /**
   * Toggles the mute state.
   */
  public static toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopDescentSound();
    } else {
      this.resumeContext();
    }
    return this.isMuted;
  }

  public static getMuteState(): boolean {
    return this.isMuted;
  }

  private static resumeContext(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Helper to create a noise audio buffer.
   */
  private static createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialised');
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Starts the continuous wind/snow sliding audio loop.
   */
  public static startDescentSound(): void {
    this.init();
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    // Clean up if already running
    this.stopDescentSound();

    try {
      // 1. Sliding Sound (Low rumble white noise)
      const noiseBuffer = this.createNoiseBuffer();
      
      this.slideNoise = this.ctx.createBufferSource();
      this.slideNoise.buffer = noiseBuffer;
      this.slideNoise.loop = true;

      this.slideFilter = this.ctx.createBiquadFilter();
      this.slideFilter.type = 'lowpass';
      this.slideFilter.frequency.setValueAtTime(350, this.ctx.currentTime); // Low rumbling filter
      this.slideFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

      this.slideGain = this.ctx.createGain();
      this.slideGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Start silent

      this.slideNoise.connect(this.slideFilter);
      this.slideFilter.connect(this.slideGain);
      this.slideGain.connect(this.ctx.destination);
      this.slideNoise.start(0);

      // 2. Carving Sound (High-hiss scraping white noise)
      this.carveNoise = this.ctx.createBufferSource();
      this.carveNoise.buffer = noiseBuffer;
      this.carveNoise.loop = true;

      this.carveFilter = this.ctx.createBiquadFilter();
      this.carveFilter.type = 'bandpass';
      this.carveFilter.frequency.setValueAtTime(2000, this.ctx.currentTime); // High scraping sound
      this.carveFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.carveGain = this.ctx.createGain();
      this.carveGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Start silent

      this.carveNoise.connect(this.carveFilter);
      this.carveFilter.connect(this.carveGain);
      this.carveGain.connect(this.ctx.destination);
      this.carveNoise.start(0);

      // Fade-in sliding sound slightly
      this.slideGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Failed to start loop audio:', e);
    }
  }

  /**
   * Modulates the volume and frequencies of sliding/carving noise in real-time.
   * @param speedPercent - Normalized current speed (0.0 to 1.0)
   * @param carvingPercent - Normalized side slip intensity (0.0 to 1.0)
   */
  public static updateDescentSound(speedPercent: number, carvingPercent: number): void {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Adjust slide wind pitch/volume with speed
    if (this.slideFilter && this.slideGain) {
      const slideFreq = 200 + speedPercent * 300; // 200Hz to 500Hz lowpass
      const slideVol = 0.05 + speedPercent * 0.10; // slightly louder when going fast
      this.slideFilter.frequency.setTargetAtTime(slideFreq, t, 0.1);
      this.slideGain.gain.setTargetAtTime(slideVol, t, 0.1);
    }

    // Adjust carve sound with steering side-slip
    if (this.carveFilter && this.carveGain) {
      const carveFreq = 1200 + speedPercent * 800; // frequency shifts up with speed
      const carveVol = carvingPercent * 0.18;      // louder when carving hard
      this.carveFilter.frequency.setTargetAtTime(carveFreq, t, 0.05);
      this.carveGain.gain.setTargetAtTime(carveVol, t, 0.05);
    }
  }

  /**
   * Stops the sliding loops.
   */
  public static stopDescentSound(): void {
    try {
      if (this.slideNoise) {
        this.slideNoise.stop();
        this.slideNoise.disconnect();
        this.slideNoise = null;
      }
      if (this.carveNoise) {
        this.carveNoise.stop();
        this.carveNoise.disconnect();
        this.carveNoise = null;
      }
      this.slideGain = null;
      this.slideFilter = null;
      this.carveGain = null;
      this.carveFilter = null;
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Plays UI button click audio (sine sweep).
   */
  public static playClick(): void {
    this.init();
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Plays menu page swiping transition sound (pleasant sweep).
   */
  public static playSwipe(): void {
    this.init();
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Plays a crash sound synthesized via frequency modulation + noise blast.
   */
  public static playCrash(): void {
    this.init();
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;

      // 1. Noise blast (Explosive snow burst)
      const noiseBuffer = this.createNoiseBuffer();
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(400, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(10, t + 0.5);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseNode.start(t);
      noiseNode.stop(t + 0.5);

      // 2. Wood splinter crash tone (Triangle drop-off)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.setValueAtTime(150, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

      oscGain.gain.setValueAtTime(0.2, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.4);
    } catch (e) {
      // Ignored
    }
  }
}
