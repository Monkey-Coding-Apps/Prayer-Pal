import { useCallback, useEffect, useRef, useState } from 'react';
import { playSacredChime, unlockAudioEngine } from './audioChime';

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

// Universal Cloud & Tone Voices (Universal support across Web, Mobile, iFrames, and APKs)
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

  // Persistent HTMLAudioElement for cloud TTS audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
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

  // Pre-initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const revokeBlob = useCallback(() => {
    if (currentBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      } catch {
        // ignore
      }
      currentBlobUrlRef.current = null;
    }
  }, []);

  // Stop function that halts all audio and resets state cleanly
  const stop = useCallback(() => {
    clearWatchdog();

    // 1. Stop HTML5 Audio
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute('src');
      } catch {
        // ignore
      }
    }
    revokeBlob();

    // 2. Stop System SpeechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    setIsSpeaking(false);
    setIsPaused(false);
  }, [clearWatchdog, revokeBlob]);

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

  // Cloud Speech Player helper via server /api/tts endpoint
  const playCloudSpeech = useCallback(
    async (text: string, lang: string) => {
      activeModeRef.current = 'cloud';
      stop();

      try {
        const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
        const response = await fetch(ttsUrl);

        if (!response.ok) {
          throw new Error(`TTS server error HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error('Received empty audio blob');
        }

        const blobUrl = URL.createObjectURL(blob);
        currentBlobUrlRef.current = blobUrl;

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        const audio = audioRef.current;
        audio.src = blobUrl;
        audio.playbackRate = Math.max(0.75, Math.min(1.25, speechRateRef.current));

        audio.onplay = () => {
          setIsSpeaking(true);
          setIsPaused(false);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          revokeBlob();
          if (autoAdvanceRef.current && onSpeechEndRef.current) {
            onSpeechEndRef.current();
          }
        };

        audio.onerror = (err) => {
          console.warn('Cloud audio element playback error:', err);
          setIsSpeaking(false);
          setIsPaused(false);
          revokeBlob();
        };

        await audio.play();
        setIsSpeaking(true);
        setIsPaused(false);
      } catch (err) {
        console.warn('Cloud TTS playback error:', err);
        setIsSpeaking(false);
        setIsPaused(false);
        revokeBlob();
      }
    },
    [stop, revokeBlob]
  );

  // Main Speak Handler
  const speak = useCallback(
    async (customText?: string, customVoiceURI?: string) => {
      if (isMutedRef.current) return;

      unlockAudioEngine();
      setHasAudioUnlocked(true);

      const text = customText || textToSpeak;
      if (!text || text.trim().length === 0) return;

      const targetURI = customVoiceURI || voiceURI || 'cloud-en-us';

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
        await playCloudSpeech(text, lang);
        return;
      }

      // 3. Device System Voices (with Watchdog safety fallback)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        activeModeRef.current = 'system';
        try {
          const currentVoices = window.speechSynthesis.getVoices() || [];
          const targetVoice = currentVoices.find(
            (v) => (v.voiceURI && v.voiceURI === targetURI) || v.name === targetURI
          );

          if (!targetVoice) {
            // Device voice unavailable -> fallback to Cloud Speech
            await playCloudSpeech(text, 'en');
            return;
          }

          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = Math.max(0.7, Math.min(1.2, speechRateRef.current));
          utterance.voice = targetVoice;
          utterance.lang = targetVoice.lang || 'en-US';

          // Watchdog timer: If device SpeechSynthesis does NOT start speaking within 1200ms,
          // assume SpeechSynthesis is frozen/silent in iframe sandbox and fallback to Cloud TTS.
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
          await playCloudSpeech(text, 'en');
          return;
        }
      }

      // Default fallback
      await playCloudSpeech(text, 'en');
    },
    [textToSpeak, voiceURI, stop, clearWatchdog, playCloudSpeech]
  );

  const pause = useCallback(() => {
    clearWatchdog();

    if (activeModeRef.current === 'cloud' && audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // ignore
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

    if (activeModeRef.current === 'cloud' && audioRef.current && audioRef.current.src) {
      try {
        audioRef.current
          .play()
          .then(() => {
            setIsPaused(false);
            setIsSpeaking(true);
          })
          .catch(() => {
            speak();
          });
      } catch {
        speak();
      }
      return;
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
