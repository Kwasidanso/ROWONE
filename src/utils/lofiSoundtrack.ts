/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class LofiSoundtrackEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private intervalIds: any[] = [];
  private currentChordIndex: number = 0;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  // Cinematic warm chords progression (Abmaj7, Gm7, Fm7, Bb9sus)
  private chords = [
    [103.83, 130.81, 155.56, 196.00], // Abmaj7 (Ab2, C3, Eb3, G3)
    [98.00, 116.54, 146.83, 174.61],  // Gm7 (G2, Bb2, D3, F3)
    [87.31, 103.83, 130.81, 155.56],  // Fm7 (F2, Ab2, C3, Eb3)
    [116.54, 146.83, 174.61, 233.08]  // Bb9sus4 (Bb2, D3, F3, Bb3)
  ];

  // Eb Major pentatonic notes for lo-fi sparkling melody
  private melodyNotes = [
    311.13, // Eb4
    349.23, // F4
    392.00, // G4
    466.16, // Bb4
    523.25, // C5
    622.25, // Eb5
    698.46, // F5
    783.99  // G5
  ];

  public start() {
    if (this.isPlaying) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      
      // Support resuming if browser blocked auto-play
      if (this.ctx.state === 'suspended') {
        const resumeOnInteraction = () => {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
          }
          window.removeEventListener('click', resumeOnInteraction);
        };
        window.addEventListener('click', resumeOnInteraction);
      }

      this.masterGain = this.ctx.createGain();
      // Master volume kept extremely cozy and unobtrusive: around 9% Max volume
      this.masterGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create Delay Effect for sparkle echoes
      this.delayNode = this.ctx.createDelay(2.0);
      this.delayNode.delayTime.setValueAtTime(0.55, this.ctx.currentTime); // 550ms echo

      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.setValueAtTime(0.40, this.ctx.currentTime); // 40% feedback decay

      // Connect Delay loop: Delay -> Feedback -> Delay
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      // Connect delay to master out
      this.delayNode.connect(this.masterGain);

      this.isPlaying = true;
      this.currentChordIndex = 0;

      // Start vinyl crackling
      this.startVinylNoise();

      // Trigger first chord and schedule periodic progression
      this.playCurrentPadChord();
      const chordInterval = setInterval(() => {
        if (!this.isPlaying) return;
        this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
        this.playCurrentPadChord();
      }, 7500); // Shift atmospheric chords every 7.5 seconds
      this.intervalIds.push(chordInterval);

      // Start gentle lo-fi rhythm (Soft kick on 60 BPM equivalent)
      const beatInterval = setInterval(() => {
        this.triggerSoftKick();
      }, 2000); // 2 second intervals
      this.intervalIds.push(beatInterval);

      // Start dynamic sparkling melody improviser
      const melodyInterval = setInterval(() => {
        // 70% chance to play a melody sparkle for relaxing syncopation
        if (Math.random() < 0.70) {
          this.triggerMelodySparkle();
        }
      }, 1800);
      this.intervalIds.push(melodyInterval);

    } catch (e) {
      console.warn('Lofi ambient engine failed initialization:', e);
    }
  }

  private startVinylNoise() {
    if (!this.ctx || !this.masterGain) return;

    try {
      // Create a noise buffer
      const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 seconds loop
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        // Red noise profile for cozy, warm analogue crackle
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Filter noise to sound soft and dusty
      const bandpassFilter = this.ctx.createBiquadFilter();
      bandpassFilter.type = 'bandpass';
      bandpassFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      bandpassFilter.Q.setValueAtTime(0.4, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      // Keep it barely perceptible background warmth (1.5% level)
      noiseGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      noiseSource.connect(bandpassFilter);
      bandpassFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noiseSource.start();

      // Keep reference to stop it
      this.activeOscillators.push({
        osc: noiseSource as any, // Duck typed for quick reference tracking
        gain: noiseGain
      });

      // Periodically inject rare static dust pops
      const crackleInterval = setInterval(() => {
        if (!this.ctx || !this.masterGain) return;
        this.triggerStaticPop();
      }, 850);
      this.intervalIds.push(crackleInterval);

    } catch (err) {
      console.warn('Vinyl noise emulator skipped:', err);
    }
  }

  private triggerStaticPop() {
    if (!this.ctx || !this.masterGain) return;

    try {
      const popOsc = this.ctx.createOscillator();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(15 + Math.random() * 45, this.ctx.currentTime);

      const popFilter = this.ctx.createBiquadFilter();
      popFilter.type = 'bandpass';
      popFilter.frequency.setValueAtTime(4000 + Math.random() * 2000, this.ctx.currentTime);
      popFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      const popGain = this.ctx.createGain();
      popGain.gain.setValueAtTime(0.003 + Math.random() * 0.005, this.ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.04);

      popOsc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.masterGain);

      popOsc.start();
      popOsc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  private playCurrentPadChord() {
    if (!this.ctx || !this.masterGain) return;

    const chordNoteFreqs = this.chords[this.currentChordIndex];
    const transitionTime = 2.5; // Smooth fade transition over 2.5 seconds

    // Fade out previous oscillators
    const now = this.ctx.currentTime;
    this.activeOscillators = this.activeOscillators.filter((item) => {
      // Keep noise sources
      if (!(item.osc instanceof OscillatorNode)) return true;
      try {
        item.gain.gain.cancelScheduledValues(now);
        item.gain.gain.setValueAtTime(item.gain.gain.value, now);
        item.gain.gain.linearRampToValueAtTime(0, now + transitionTime);
        item.osc.stop(now + transitionTime + 0.1);
      } catch {}
      return false;
    });

    // Spawn new oscillators for current warm cinematic pad chord
    chordNoteFreqs.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      // Triangle wave delivers beautiful woody, warm organesque textures
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Low-pass filter to strip aggressive highs and keep pad dark & cinematic
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(280, now);
      // Subtle organic filter modulation (warm analog drift)
      lowpass.frequency.linearRampToValueAtTime(320, now + 3);
      lowpass.frequency.linearRampToValueAtTime(280, now + 7.5);

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0.0001, now);
      // Beautiful slow ambient attack
      voiceGain.gain.linearRampToValueAtTime(0.045, now + transitionTime);

      osc.connect(lowpass);
      lowpass.connect(voiceGain);
      voiceGain.connect(this.masterGain);

      osc.start();

      this.activeOscillators.push({ osc, gain: voiceGain });
    });
  }

  private triggerSoftKick() {
    if (!this.ctx || !this.masterGain) return;

    try {
      const kickOsc = this.ctx.createOscillator();
      kickOsc.type = 'sine';
      
      const kickGain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      // Soft base thud: sweep frequency from 95Hz down to 40Hz
      kickOsc.frequency.setValueAtTime(95, now);
      kickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

      // Cozy, non-jarring low kick volume envelope
      kickGain.gain.setValueAtTime(0.05, now);
      kickGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.25);

      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain);

      kickOsc.start();
      kickOsc.stop(now + 0.28);
    } catch {}
  }

  private triggerMelodySparkle() {
    if (!this.ctx || !this.masterGain || !this.delayNode) return;

    try {
      // Pick random pentatonic note
      const freq = this.melodyNotes[Math.floor(Math.random() * this.melodyNotes.length)];
      const now = this.ctx.currentTime;

      const sparkOsc = this.ctx.createOscillator();
      // Sine wave is clean, crystalline, and evokes Fender Rhodes vibes
      sparkOsc.type = 'sine';
      sparkOsc.frequency.setValueAtTime(freq, now);

      // Add gentle pitch vibrato for analogue tape wow-and-flutter feel
      const vibrato = this.ctx.createOscillator();
      vibrato.frequency.setValueAtTime(3.8, now); // 3.8Hz wobble
      const vibratoGain = this.ctx.createGain();
      vibratoGain.gain.setValueAtTime(1.8, now); // wobble intensity of 1.8Hz
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(sparkOsc.frequency);
      vibrato.start();

      const voiceGain = this.ctx.createGain();
      // Sparkling micro attack
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(0.024, now + 0.02);
      // Slow release decay
      voiceGain.gain.exponentialRampToValueAtTime(0.00001, now + 1.8);

      // Connect to master output and the delay echo unit
      sparkOsc.connect(voiceGain);
      voiceGain.connect(this.masterGain);
      voiceGain.connect(this.delayNode);

      sparkOsc.start();
      sparkOsc.stop(now + 2.0);
      vibrato.stop(now + 2.0);
    } catch {}
  }

  public stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    // Clear all scheduled intervals
    this.intervalIds.forEach((id) => clearInterval(id));
    this.intervalIds = [];

    const now = this.ctx ? this.ctx.currentTime : 0;

    // Fade out active notes cleanly to prevent pop artifacts on stop
    this.activeOscillators.forEach((item) => {
      try {
        item.gain.gain.cancelScheduledValues(now);
        item.gain.gain.setValueAtTime(item.gain.gain.value, now);
        item.gain.gain.linearRampToValueAtTime(0.00001, now + 0.6);
        item.osc.stop(now + 0.7);
      } catch {}
    });
    this.activeOscillators = [];

    // Shut down context after a small delay
    setTimeout(() => {
      if (this.ctx) {
        this.ctx.close().catch(() => {});
        this.ctx = null;
      }
    }, 700);
  }
}

// Export a single thread-safe global manager instance
export const lofiSoundtrack = new LofiSoundtrackEngine();
