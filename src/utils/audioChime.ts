// Web Audio API helper for sacred prayer bell / singing bowl chimes
// Ensures rich, soothing acoustic sound across all mobile & desktop browsers.

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Unlock audio context and Web Speech API on iOS/Android mobile browsers.
 * Must be called during or after a user click/touch event.
 */
export function unlockAudioEngine(): void {
  if (typeof window === 'undefined') return;

  // 1. Resume Web Audio Context
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 2. Unlock Web Speech API on iOS Safari / Chrome Mobile
  if ('speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Speak a 1-character silent/soft utterance to register user gesture
      const silentUtterance = new SpeechSynthesisUtterance(' ');
      silentUtterance.volume = 0.01;
      silentUtterance.rate = 2.0;
      window.speechSynthesis.speak(silentUtterance);
    } catch {
      // Ignore initial unlock errors
    }
  }
}

/**
 * Play a resonant, peaceful sacred prayer bell / singing bowl chime.
 * Frequency default: 432 Hz (A4 tuning) or 528 Hz (Miracle tone) or 396 Hz.
 */
export function playSacredChime(freq = 432, duration = 2.5): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(ctx.destination);

    // Fundamental Tone (Sine Wave)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    // Harmonic Overtones for singing bowl warmth
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, now); // Metallic overtone

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 5.4, now);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

    const gain3 = ctx.createGain();
    gain3.gain.setValueAtTime(0.02, now);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.4);

    osc1.connect(masterGain);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc3.connect(gain3);
    gain3.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + duration);
    osc2.stop(now + duration);
    osc3.stop(now + duration);
  } catch {
    // Fail silently if Web Audio is restricted
  }
}
