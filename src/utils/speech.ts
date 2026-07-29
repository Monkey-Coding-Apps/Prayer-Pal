import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, getGlobalAudioElement, playSacredChime, unlockAudioEngine } from './audioChime';
import { getStoredAudioUrl } from './audioStorage';

// Use Capacitor for native HTTP to bypass CORS on Android
let Capacitor: any = null;
if (typeof window !== 'undefined') {
  try {
    // Attempt to get Capacitor from window (global) or potentially use a dynamic import if needed
    Capacitor = (window as any).Capacitor;
  } catch {
    // ignore
  }
}

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

// Universal Cloud, Stored & Tone Voices (Supported everywhere: Web, Mobile, APK, Android WebView)
export const UNIVERSAL_VOICES: VoiceOption[] = [
  {
    voiceURI: 'stored-mp3',
    name: 'Pre-Recorded Bundled Voice (100% Offline & Mobile Ready)',
    lang: 'en',
    isLocalService: true,
    default: true,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-en-us',
    name: 'English (US - Clear & Gentle Cloud Voice)',
    lang: 'en',
    isLocalService: false,
    default: false,
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
const audioBufferCache = new Map<string, AudioBuffer>();

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

    // Real-time playback rate adjustment for active Web Audio source node or HTML audio element
    const clampedRate = Math.max(0.5, Math.min(2.0, speechRate));
    if (activeSourceNode) {
      try {
        const ctx = getAudioContext();
        if (ctx) {
          activeSourceNode.playbackRate.setValueAtTime(clampedRate, ctx.currentTime);
        } else {
          activeSourceNode.playbackRate.value = clampedRate;
        }
      } catch {
        // ignore
      }
    }

    const audio = getGlobalAudioElement();
    if (audio) {
      try {
        audio.playbackRate = clampedRate;
      } catch {
        // ignore
      }
    }
  }, [speechRate]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Screen Wake Lock API to prevent screen from sleeping while prayer audio is playing
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
        try {
          if (!wakeLockSentinel) {
            wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
            wakeLockSentinel.addEventListener('release', () => {
              wakeLockSentinel = null;
            });
          }
        } catch {
          // Ignore wake lock error (e.g. low battery, background tab)
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockSentinel) {
        try {
          await wakeLockSentinel.release();
        } catch {
          // ignore
        }
        wakeLockSentinel = null;
      }
    };

    if (isSpeaking && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSpeaking && !isPaused) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isSpeaking, isPaused]);

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
    console.log('loadVoices called');
    let availableVoices: SpeechSynthesisVoice[] = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        availableVoices = window.speechSynthesis.getVoices() || [];
        console.log(`System voices found: ${availableVoices.length}`);
      } catch (err) {
        console.error('Error getting system voices:', err);
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
    console.log(`Total voices in state: ${combined.length}`);
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
      console.log('Setting onvoiceschanged listener and polling for Android');
      window.speechSynthesis.onvoiceschanged = loadVoices;

      // Polling fallback: Android WebViews often don't fire onvoiceschanged reliably
      const interval = setInterval(() => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          console.log('Polling found voices, updating...');
          loadVoices();
          clearInterval(interval);
        }
      }, 1000);

      // Stop polling after 10 seconds to save battery
      const timeout = setTimeout(() => clearInterval(interval), 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [loadVoices]);

  // Play bundled static MP3 audio (100% offline & mobile/Android Studio compatible)
  const playStoredAudio = useCallback(async (textOrId: string): Promise<boolean> => {
    activeModeRef.current = 'cloud';
    const mp3Url = getStoredAudioUrl(textOrId);

    if (!mp3Url) return false;

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
        audio.pause();
      } catch {
        // ignore
      }
    }

    setIsSpeaking(true);
    setIsPaused(false);

    const controller = new AbortController();
    currentFetchController = controller;

    try {
      const ctx = getAudioContext();

      // Check if AudioBuffer is already cached
      let audioBuffer = audioBufferCache.get(mp3Url);

      if (!audioBuffer) {
        const res = await fetch(mp3Url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const arrayBuf = await res.arrayBuffer();
        if (controller.signal.aborted) return true;

        if (ctx) {
          // Decode audio data. Use a slice to ensure we have a fresh buffer for decodeAudioData
          audioBuffer = await decodeAudioDataPromise(ctx, arrayBuf.slice(0));
          if (controller.signal.aborted) return true;
          audioBufferCache.set(mp3Url, audioBuffer);
        }
      }

      if (ctx && audioBuffer) {
        if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
          await ctx.resume().catch(() => {});
        }

        try {
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = Math.max(0.5, Math.min(2.0, speechRateRef.current));
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
          return true;
        } catch (decodeErr) {
          console.warn('Web Audio playback failed for stored audio:', decodeErr);
        }
      }

      if (audio) {
        audio.src = mp3Url;
        audio.load(); // Force load
        audio.onplay = () => {
          try {
            audio.playbackRate = Math.max(0.5, Math.min(2.0, speechRateRef.current));
          } catch {
            // ignore
          }
          setIsSpeaking(true);
          setIsPaused(false);
        };
        audio.onended = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          if (autoAdvanceRef.current && onSpeechEndRef.current) {
            onSpeechEndRef.current();
          }
        };
        audio.onerror = (e) => {
          console.error("Stored HTML5 Audio Error:", e);
          setIsSpeaking(false);
          setIsPaused(false);
        };
        const p = audio.play();
        if (p !== undefined) await p;
        return true;
      }
      return false;
    } catch (err: any) {
      if (err?.name === 'AbortError') return true;
      console.warn('Stored audio playback error:', err.message || err);
      return false;
    }
  }, []);

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

    // Detect if running on native Capacitor (where localhost:3000 server is unreachable)
    const isNative = Capacitor?.isNativePlatform?.();

    // In Capacitor, origin is https://localhost. The Node server is NOT running there.
    // Use direct Google Translate TTS as a fallback or a remote proxy.
    const origin = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '';

    // If native, use direct URL. Google Translate TTS works well with client=tw-ob
    const ttsUrl = isNative
      ? `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${encodeURIComponent(lang)}&client=tw-ob`
      : `${origin}/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;

    try {
      console.log(`Attempting TTS [Native: ${isNative}]: ${ttsUrl}`);

      let arrayBuf: ArrayBuffer;

      // Use Capacitor HTTP for native to bypass CORS/User-Agent issues
      if (isNative && Capacitor.Plugins?.CapacitorHttp) {
        console.log('Using CapacitorHttp for TTS fetch');
        const response = await Capacitor.Plugins.CapacitorHttp.get({
          url: ttsUrl,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/'
          }
        });

        if (response.status !== 200) throw new Error(`CapacitorHttp status ${response.status}`);

        // Capacitor returns base64 or arraybuffer depending on config.
        if (typeof response.data === 'string') {
          const binaryString = window.atob(response.data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
          arrayBuf = bytes.buffer;
        } else {
          arrayBuf = response.data;
        }
      } else {
        const res = await fetch(ttsUrl, {
          signal: controller.signal,
          headers: isNative ? {} : { 'Accept': 'audio/mpeg' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        arrayBuf = await res.arrayBuffer();
      }

      if (controller.signal.aborted) return;
      if (!arrayBuf || arrayBuf.byteLength === 0) throw new Error("Empty audio buffer received");

      // 1. Web Audio API playback (bypasses Android gesture locks after AudioContext unlock)
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
          await ctx.resume().catch(() => {});
        }

        try {
          // Decode audio data. Use a slice to ensure we have a fresh buffer
          const audioBuffer = await decodeAudioDataPromise(ctx, arrayBuf.slice(0));
          if (controller.signal.aborted) return;

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = Math.max(0.5, Math.min(2.0, speechRateRef.current));
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
          console.warn('Web Audio decode failed, falling back to HTML5 Audio:', decodeErr);
        }
      }

      // 2. Blob URL Fallback on HTML5 Audio Element (More robust for some Android WebViews)
      if (audio) {
        const blob = new Blob([arrayBuf], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        audio.src = blobUrl;
        audio.load(); // Force load on Android

        audio.onplay = () => {
          try {
            audio.playbackRate = Math.max(0.5, Math.min(2.0, speechRateRef.current));
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

        audio.onerror = (e) => {
          console.error("HTML5 Audio Error:", e);
          URL.revokeObjectURL(blobUrl);
          setIsSpeaking(false);
          setIsPaused(false);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Cloud speech failed:', err.message || err);

      // Final fallback: try stored audio if available, or just end
      const played = await playStoredAudio(text);
      if (!played) {
        setIsSpeaking(false);
        setIsPaused(false);
      }
    }
  }, [playStoredAudio]);

  // Main Speak Handler
  const speak = useCallback(
    async (customText?: string, customVoiceURI?: string) => {
      if (isMutedRef.current) return;

      unlockAudioEngine();
      setHasAudioUnlocked(true);

      const text = customText || textToSpeak;
      if (!text || text.trim().length === 0) return;

      let targetURI = customVoiceURI || voiceURI || 'stored-mp3';
      if (!targetURI || targetURI === 'null' || targetURI === 'undefined' || targetURI === 'default-system-voice') {
        targetURI = 'stored-mp3';
      }

      // Halt any previous playback
      stop();

      // 1. Stored MP3 Voice (Highest Android & Offline APK Compatibility)
      if (targetURI === 'stored-mp3') {
        const handled = await playStoredAudio(text);
        if (handled) return;
        // Fallback to cloud speech if no stored file matched
        playCloudSpeech(text, 'en');
        return;
      }

      // 2. Sacred Chime & Bell Only Mode
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

      // 3. Universal Cloud Voices
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
          utterance.rate = Math.max(0.5, Math.min(2.0, speechRateRef.current));
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
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'running') {
        ctx.suspend().catch(() => {});
      }
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
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          setIsPaused(false);
          setIsSpeaking(true);
        }).catch(() => {
          speak();
        });
        return;
      }
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
