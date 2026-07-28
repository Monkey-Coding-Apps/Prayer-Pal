import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, getGlobalAudioElement, playSacredChime, unlockAudioEngine } from './audioChime';

export interface VoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isLocalService: boolean;
  default: boolean;
  provider?: 'cloud' | 'system' | 'synth';
}

export interface UseSpeechProps {
  textToSpeak: string;
  speechRate: number; // 0.7 to 1.1
  voiceURI: string | null;
  isMuted: boolean;
  autoAdvance: boolean;
  onSpeechEnd?: () => void;
}

// Universal Cloud & Tone Voices (Supported everywhere: Web, Mobile, APK, Android WebView)
export const UNIVERSAL_VOICES: VoiceOption[] = [
  {
    voiceURI: 'cloud-en-us',
    name: 'English (US - Clear & Gentle)',
    lang: 'en',
    isLocalService: false,
    default: true,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-en-gb',
    name: 'English (UK - Reverent British)',
    lang: 'en-gb',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-en-au',
    name: 'English (Australian)',
    lang: 'en-au',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-la',
    name: 'Latin (Ecclesiastical)',
    lang: 'la',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-es',
    name: 'Spanish (Español)',
    lang: 'es',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-fr',
    name: 'French (Français)',
    lang: 'fr',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-it',
    name: 'Italian (Italiano)',
    lang: 'it',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-de',
    name: 'German (Deutsch)',
    lang: 'de',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'chime-bell',
    name: 'Sacred Chime & Bell (Tone Mode)',
    lang: 'en-US',
    isLocalService: true,
    default: false,
    provider: 'synth',
  },
];

const CLOUD_LANG_MAP: Record<string, string> = {
  'cloud-en-us': 'en',
  'cloud-en-gb': 'en-gb',
  'cloud-en-au': 'en-au',
  'cloud-la': 'la',
  'cloud-es': 'es',
  'cloud-fr': 'fr',
  'cloud-it': 'it',
  'cloud-de': 'de',
};

// Global active Web Audio nodes & fetch controller for instant cancellation
let activeSourceNode: AudioBufferSourceNode | null = null;
let currentFetchController: AbortController | null = null;

function decodeAudioDataPromise(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const res = ctx.decodeAudioData(
        data,
        (buf) => resolve(buf),
        (err) => reject(err)
      );
      if (res && typeof (res as Promise<AudioBuffer>).then === 'function') {
        (res as Promise<AudioBuffer>).then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export function useSpeech({
  textToSpeak,
  speechRate,
  voiceURI,
  isMuted,
  autoAdvance,
  onSpeechEnd,
}: UseSpeechProps) {
  const [voices, setVoices] = useState<VoiceOption[]>(UNIVERSAL_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasAudioUnlocked, setHasAudioUnlocked] = useState(false);

  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeModeRef = useRef<'cloud' | 'system' | 'synth'>('cloud');

  const onSpeechEndRef = useRef(onSpeechEnd);
  const autoAdvanceRef = useRef(autoAdvance);
  const speechRateRef = useRef(speechRate);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd]);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  // Stop function that halts all audio and resets state cleanly
  const stop = useCallback(() => {
    clearWatchdog();

    if (currentFetchController) {
      currentFetchController.abort();
      currentFetchController = null;
    }

    if (activeSourceNode) {
      try {
        activeSourceNode.stop();
        activeSourceNode.disconnect();
      } catch {
        // ignore
      }
      activeSourceNode = null;
    }

    const audio = getGlobalAudioElement();
    if (audio) {
      try {
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    setIsSpeaking(false);
    setIsPaused(false);
  }, [clearWatchdog]);

  // Mute effect
  useEffect(() => {
    if (isMuted) {
      stop();
    }
  }, [isMuted, stop]);

  // Load device system voices and merge with Universal Cloud Voices
  const loadVoices = useCallback(() => {
    let availableVoices: SpeechSynthesisVoice[] = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        availableVoices = window.speechSynthesis.getVoices() || [];
      } catch {
        availableVoices = [];
      }
    }

    const systemMapped: VoiceOption[] = availableVoices.map((v) => ({
      voiceURI: v.voiceURI || v.name,
      name: `Device System: ${v.name || 'Voice'}`,
      lang: v.lang || 'en-US',
      isLocalService: v.localService,
      default: v.default,
      provider: 'system',
    }));

    const combined = [...UNIVERSAL_VOICES, ...systemMapped];
    setVoices(combined);

    if (voiceURI) {
      const matched = availableVoices.find(
        (v) => (v.voiceURI && v.voiceURI === voiceURI) || v.name === voiceURI
      );
      setSelectedVoice(matched || null);
    }
  }, [voiceURI]);

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  // Cloud Speech player with Web Audio API (100% Android & Mobile compatible)
  const playCloudSpeech = useCallback(async (text: string, lang: string) => {
    activeModeRef.current = 'cloud';

    if (currentFetchController) {
      currentFetchController.abort();
      currentFetchController = null;
    }

    if (activeSourceNode) {
      try {
        activeSourceNode.stop();
        activeSourceNode.disconnect();
      } catch {
        // ignore
      }
      activeSourceNode = null;
    }

    const audio = getGlobalAudioElement();
    if (audio) {
      try {
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      } catch {
        // ignore
      }
    }

    setIsSpeaking(true);
    setIsPaused(false);

    const controller = new AbortController();
    currentFetchController = controller;

    const origin = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '';
    const ttsUrl = `${origin}/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;

    try {
      const res = await fetch(ttsUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const arrayBuf = await res.arrayBuffer();
      if (controller.signal.aborted) return;

      // 1. Web Audio API playback (bypasses Android gesture locks after AudioContext unlock)
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }

        try {
          const audioBuffer = await decodeAudioDataPromise(ctx, arrayBuf.slice(0));
          if (controller.signal.aborted) return;

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = Math.max(0.75, Math.min(1.25, speechRateRef.current));
          source.connect(ctx.destination);

          activeSourceNode = source;

          source.onended = () => {
            if (activeSourceNode === source) {
              activeSourceNode = null;
              setIsSpeaking(false);
              setIsPaused(false);
              if (autoAdvanceRef.current && onSpeechEndRef.current) {
                onSpeechEndRef.current();
              }
            }
          };

          source.start(0);
          setIsSpeaking(true);
          setIsPaused(false);
          return;
        } catch (decodeErr) {
          console.warn('Web Audio decode failed, falling back to Blob audio:', decodeErr);
        }
      }

      // 2. Blob URL Fallback on HTML5 Audio Element
      if (audio) {
        const blob = new Blob([arrayBuf], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        audio.src = blobUrl;

        audio.onplay = () => {
          try {
            audio.playbackRate = Math.max(0.75, Math.min(1.25, speechRateRef.current));
          } catch {
            // ignore
          }
          setIsSpeaking(true);
          setIsPaused(false);
        };

        audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
          setIsSpeaking(false);
          setIsPaused(false);
          if (autoAdvanceRef.current && onSpeechEndRef.current) {
            onSpeechEndRef.current();
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          setIsSpeaking(false);
          setIsPaused(false);
        };

        await audio.play();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Cloud speech playback failed:', err);
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  // Main Speak Handler
  const speak = useCallback(
    (customText?: string, customVoiceURI?: string) => {
      if (isMutedRef.current) return;

      unlockAudioEngine();
      setHasAudioUnlocked(true);

      const text = customText || textToSpeak;
      if (!text || text.trim().length === 0) return;

      let targetURI = customVoiceURI || voiceURI || 'cloud-en-us';
      if (!targetURI || targetURI === 'null' || targetURI === 'undefined' || targetURI === 'default-system-voice') {
        targetURI = 'cloud-en-us';
      }

      // Halt any previous playback
      stop();

      // 1. Sacred Chime & Bell Only Mode
      if (targetURI === 'chime-bell') {
        activeModeRef.current = 'synth';
        setIsSpeaking(true);
        setIsPaused(false);
        playSacredChime(432, 2.0);
        setTimeout(() => {
          setIsSpeaking(false);
          setIsPaused(false);
          if (autoAdvanceRef.current && onSpeechEndRef.current) {
            onSpeechEndRef.current();
          }
        }, 2200);
        return;
      }

      // 2. Universal Cloud Voices
      if (targetURI.startsWith('cloud-') || targetURI === 'default-system-voice') {
        const lang = CLOUD_LANG_MAP[targetURI] || 'en';
        playCloudSpeech(text, lang);
        return;
      }

      // 3. Device System Voices (with Watchdog safety fallback for Android)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        activeModeRef.current = 'system';
        try {
          const currentVoices = window.speechSynthesis.getVoices() || [];
          const targetVoice = currentVoices.find(
            (v) => (v.voiceURI && v.voiceURI === targetURI) || v.name === targetURI
          );

          if (!targetVoice) {
            // Device voice unavailable -> fallback to Cloud Speech
            playCloudSpeech(text, 'en');
            return;
          }

          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = Math.max(0.7, Math.min(1.2, speechRateRef.current));
          utterance.voice = targetVoice;
          utterance.lang = targetVoice.lang || 'en-US';

          // Watchdog timer: If Android SpeechSynthesis does NOT start speaking within 1200ms,
          // fallback to Cloud TTS.
          clearWatchdog();
          watchdogTimerRef.current = setTimeout(() => {
            console.warn('Device SpeechSynthesis start timed out. Falling back to Cloud TTS.');
            try {
              window.speechSynthesis.cancel();
            } catch {
              // ignore
            }
            playCloudSpeech(text, 'en');
          }, 1200);

          utterance.onstart = () => {
            clearWatchdog();
            setIsSpeaking(true);
            setIsPaused(false);
          };

          utterance.onend = () => {
            clearWatchdog();
            setIsSpeaking(false);
            setIsPaused(false);
            if (autoAdvanceRef.current && onSpeechEndRef.current) {
              onSpeechEndRef.current();
            }
          };

          utterance.onerror = (e) => {
            clearWatchdog();
            console.warn('Device SpeechSynthesis error:', e);
            playCloudSpeech(text, 'en');
          };

          window.speechSynthesis.speak(utterance);
          return;
        } catch (e) {
          console.warn('System SpeechSynthesis execution failed:', e);
          playCloudSpeech(text, 'en');
          return;
        }
      }

      // Default fallback
      playCloudSpeech(text, 'en');
    },
    [textToSpeak, voiceURI, stop, clearWatchdog, playCloudSpeech]
  );

  const pause = useCallback(() => {
    clearWatchdog();

    if (activeModeRef.current === 'cloud') {
      const audio = getGlobalAudioElement();
      if (audio) {
        try {
          audio.pause();
        } catch {
          // ignore
        }
      }
      setIsPaused(true);
      setIsSpeaking(false);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // ignore
      }
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [clearWatchdog]);

  const resume = useCallback(() => {
    unlockAudioEngine();

    if (activeModeRef.current === 'cloud') {
      const audio = getGlobalAudioElement();
      if (audio && audio.src) {
        audio.play().then(() => {
          setIsPaused(false);
          setIsSpeaking(true);
        }).catch(() => {
          speak();
        });
        return;
      }
    }

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.paused
    ) {
      try {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsSpeaking(true);
      } catch {
        speak();
      }
    } else {
      speak();
    }
  }, [speak]);

  // Test voice preview sample
  const testVoice = useCallback(
    (targetVoiceURI?: string) => {
      speak('Hail Mary, full of grace, the Lord is with thee.', targetVoiceURI);
    },
    [speak]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    voices,
    selectedVoice,
    isSpeaking,
    isPaused,
    hasAudioUnlocked,
    loadVoices,
    speak,
    pause,
    resume,
    stop,
    testVoice,
  };
}
