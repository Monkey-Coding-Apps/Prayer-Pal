import { useCallback, useEffect, useRef, useState } from 'react';
import { playSacredChime, unlockAudioEngine } from './audioChime';

export interface VoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isLocalService: boolean;
  default: boolean;
  provider?: 'responsive' | 'cloud' | 'system' | 'synth';
}

export interface UseSpeechProps {
  textToSpeak: string;
  speechRate: number; // 0.7 to 1.1
  voiceURI: string | null;
  isMuted: boolean;
  autoAdvance: boolean;
  onSpeechEnd?: () => void;
}

// 1. ResponsiveVoice & Cloud Preset Voices (Universal support for Web & APK)
export const UNIVERSAL_VOICES: VoiceOption[] = [
  {
    voiceURI: 'rv-us-female',
    name: 'English (US Female - Clear)',
    lang: 'en-US',
    isLocalService: false,
    default: true,
    provider: 'responsive',
  },
  {
    voiceURI: 'rv-us-male',
    name: 'English (US Male - Reverent)',
    lang: 'en-US',
    isLocalService: false,
    default: false,
    provider: 'responsive',
  },
  {
    voiceURI: 'rv-uk-male',
    name: 'English (UK Male - Brian)',
    lang: 'en-GB',
    isLocalService: false,
    default: false,
    provider: 'responsive',
  },
  {
    voiceURI: 'rv-uk-female',
    name: 'English (UK Female - Amy)',
    lang: 'en-GB',
    isLocalService: false,
    default: false,
    provider: 'responsive',
  },
  {
    voiceURI: 'rv-es-female',
    name: 'Spanish (Español - María)',
    lang: 'es-ES',
    isLocalService: false,
    default: false,
    provider: 'responsive',
  },
  {
    voiceURI: 'rv-la-male',
    name: 'Latin (Ecclesiastical)',
    lang: 'la',
    isLocalService: false,
    default: false,
    provider: 'responsive',
  },
  {
    voiceURI: 'cloud-brian',
    name: 'Cloud Voice (British Male - Brian)',
    lang: 'en-GB',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-amy',
    name: 'Cloud Voice (British Female - Amy)',
    lang: 'en-GB',
    isLocalService: false,
    default: false,
    provider: 'cloud',
  },
  {
    voiceURI: 'cloud-ivy',
    name: 'Cloud Voice (US Female - Ivy)',
    lang: 'en-US',
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

const RV_VOICE_MAP: Record<string, string> = {
  'rv-us-female': 'US English Female',
  'rv-us-male': 'US English Male',
  'rv-uk-male': 'UK English Male',
  'rv-uk-female': 'UK English Female',
  'rv-es-female': 'Spanish Female',
  'rv-la-male': 'Latin Male',
};

const CLOUD_VOICE_MAP: Record<string, string> = {
  'cloud-brian': 'Brian',
  'cloud-amy': 'Amy',
  'cloud-ivy': 'Ivy',
};

// Script loader helper for ResponsiveVoice CDN
function ensureResponsiveVoice(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);

    const win = window as unknown as { responsiveVoice?: { speak: unknown } };
    if (win.responsiveVoice) {
      return resolve(true);
    }

    const existingScript = document.getElementById('responsive-voice-script');
    if (existingScript) {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if (win.responsiveVoice) {
          clearInterval(interval);
          resolve(true);
        } else if (checks > 20) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'responsive-voice-script';
    script.src = 'https://code.responsivevoice.org/responsivevoice.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('ResponsiveVoice CDN script unavailable');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

function splitTextIntoChunks(text: string, maxLen = 120): string[] {
  if (!text) return [];
  const rawSentences = text.match(/[^.!?;\n]+[.!?;\n]*/g) || [text];
  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
    } else {
      const parts = trimmed.split(/([,:]\s*)/);
      let current = '';
      for (const part of parts) {
        if ((current + part).length <= maxLen) {
          current += part;
        } else {
          if (current.trim()) chunks.push(current.trim());
          current = part;
        }
      }
      if (current.trim()) {
        chunks.push(current.trim());
      }
    }
  }

  return chunks.length > 0 ? chunks : [text];
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

  // Single persistent HTMLAudioElement for mobile/APK pre-unlocked playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeModeRef = useRef<'responsive' | 'cloud' | 'system' | 'synth'>('responsive');
  const cloudQueueRef = useRef<string[]>([]);
  const cloudIndexRef = useRef<number>(0);

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

  // Pre-initialize persistent audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }

    // Attempt loading ResponsiveVoice CDN script right away
    ensureResponsiveVoice();
  }, []);

  // Stop everything helper
  const stop = useCallback(() => {
    // 1. Stop Cloud / HTML5 Audio
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    cloudQueueRef.current = [];
    cloudIndexRef.current = 0;

    // 2. Stop ResponsiveVoice
    if (typeof window !== 'undefined') {
      const win = window as unknown as { responsiveVoice?: { cancel: () => void } };
      if (win.responsiveVoice && typeof win.responsiveVoice.cancel === 'function') {
        try {
          win.responsiveVoice.cancel();
        } catch {
          // ignore
        }
      }
    }

    // 3. Stop System SpeechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  // Mute effect
  useEffect(() => {
    if (isMuted) {
      stop();
    }
  }, [isMuted, stop]);

  // Load and map available system voices and merge with Universal Voices
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

  // Main Speak Handler with 4-Layer Fallback Architecture
  const speak = useCallback(
    async (customText?: string, customVoiceURI?: string) => {
      if (isMutedRef.current) return;

      unlockAudioEngine();
      setHasAudioUnlocked(true);

      const text = customText || textToSpeak;
      if (!text || text.trim().length === 0) return;

      const targetURI = customVoiceURI || voiceURI || 'rv-us-female';

      // 1. Chime Bell Mode
      if (targetURI === 'chime-bell') {
        activeModeRef.current = 'synth';
        setIsSpeaking(true);
        setIsPaused(false);
        playSacredChime(432, 2.0);
        setTimeout(() => {
          setIsSpeaking(false);
          if (autoAdvanceRef.current && onSpeechEndRef.current) {
            onSpeechEndRef.current();
          }
        }, 2200);
        return;
      }

      // Stop previous speech
      stop();

      // 2. ResponsiveVoice Engine Attempt
      if (targetURI.startsWith('rv-')) {
        activeModeRef.current = 'responsive';
        const rvName = RV_VOICE_MAP[targetURI] || 'US English Female';

        const isLoaded = await ensureResponsiveVoice();
        const win = window as unknown as {
          responsiveVoice?: {
            speak: (
              text: string,
              voice: string,
              options: {
                rate?: number;
                pitch?: number;
                onstart?: () => void;
                onend?: () => void;
                onerror?: (err: unknown) => void;
              }
            ) => void;
          };
        };

        if (isLoaded && win.responsiveVoice && typeof win.responsiveVoice.speak === 'function') {
          try {
            setIsSpeaking(true);
            setIsPaused(false);

            win.responsiveVoice.speak(text, rvName, {
              rate: Math.max(0.7, Math.min(1.2, speechRateRef.current)),
              pitch: 1.0,
              onstart: () => {
                setIsSpeaking(true);
                setIsPaused(false);
              },
              onend: () => {
                setIsSpeaking(false);
                setIsPaused(false);
                if (autoAdvanceRef.current && onSpeechEndRef.current) {
                  onSpeechEndRef.current();
                }
              },
              onerror: (err) => {
                console.warn('ResponsiveVoice error, attempting Cloud Audio fallback:', err);
                fallbackToCloudAudio(text, 'Brian');
              },
            });
            return;
          } catch (rvErr) {
            console.warn('ResponsiveVoice call failed, falling back to Cloud Audio:', rvErr);
          }
        }
      }

      // 3. StreamElements Cloud MP3 Engine
      if (targetURI.startsWith('cloud-') || targetURI.startsWith('rv-')) {
        const cloudVoiceName = CLOUD_VOICE_MAP[targetURI] || 'Brian';
        fallbackToCloudAudio(text, cloudVoiceName);
        return;
      }

      // 4. Device System SpeechSynthesis Engine
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        activeModeRef.current = 'system';
        try {
          let currentVoices = window.speechSynthesis.getVoices() || [];
          let targetVoice = currentVoices.find(
            (v) => (v.voiceURI && v.voiceURI === targetURI) || v.name === targetURI
          );

          if (!targetVoice && currentVoices.length > 0) {
            targetVoice = currentVoices[0];
          }

          if (!targetVoice) {
            // Fall back to Cloud Audio
            fallbackToCloudAudio(text, 'Brian');
            return;
          }

          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = Math.max(0.7, Math.min(1.2, speechRateRef.current));
          utterance.voice = targetVoice;
          utterance.lang = targetVoice.lang || 'en-US';

          utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
            if (autoAdvanceRef.current && onSpeechEndRef.current) {
              onSpeechEndRef.current();
            }
          };

          utterance.onerror = (e) => {
            console.warn('System SpeechSynthesis error, falling back to Cloud Audio:', e);
            fallbackToCloudAudio(text, 'Brian');
          };

          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
          setIsPaused(false);
          return;
        } catch (e) {
          console.warn('System SpeechSynthesis failed:', e);
          fallbackToCloudAudio(text, 'Brian');
          return;
        }
      }

      // Ultimate Fallback: Cloud Audio
      fallbackToCloudAudio(text, 'Brian');
    },
    [textToSpeak, voiceURI, stop]
  );

  // Cloud MP3 fallback handler using persistent Audio element
  const fallbackToCloudAudio = useCallback((textToPlay: string, voiceName: string) => {
    activeModeRef.current = 'cloud';
    const chunks = splitTextIntoChunks(textToPlay);
    if (!chunks || chunks.length === 0) return;

    cloudQueueRef.current = chunks;
    cloudIndexRef.current = 0;

    setIsSpeaking(true);
    setIsPaused(false);

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const playNext = () => {
      if (cloudIndexRef.current >= cloudQueueRef.current.length) {
        setIsSpeaking(false);
        setIsPaused(false);
        if (autoAdvanceRef.current && onSpeechEndRef.current) {
          onSpeechEndRef.current();
        }
        return;
      }

      const chunk = cloudQueueRef.current[cloudIndexRef.current];
      const encoded = encodeURIComponent(chunk);
      const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voiceName}&text=${encoded}`;

      audio.src = url;
      audio.playbackRate = Math.max(0.75, Math.min(1.25, speechRateRef.current));

      audio.onended = () => {
        cloudIndexRef.current++;
        playNext();
      };

      audio.onerror = (err) => {
        console.warn('Cloud audio chunk error, skipping to next:', err);
        cloudIndexRef.current++;
        playNext();
      };

      audio
        .play()
        .then(() => {
          setIsSpeaking(true);
          setIsPaused(false);
        })
        .catch((playErr) => {
          console.warn('Cloud audio play blocked/failed:', playErr);
          // If even MP3 audio play is blocked, chime bell as audio feedback
          playSacredChime(432, 1.5);
          setIsSpeaking(false);
        });
    };

    playNext();
  }, []);

  const pause = useCallback(() => {
    if (activeModeRef.current === 'cloud' && audioRef.current) {
      try {
        audioRef.current.pause();
        setIsPaused(true);
        setIsSpeaking(false);
      } catch {
        // ignore
      }
      return;
    }

    if (activeModeRef.current === 'responsive') {
      const win = window as unknown as { responsiveVoice?: { pause: () => void } };
      if (win.responsiveVoice && typeof win.responsiveVoice.pause === 'function') {
        try {
          win.responsiveVoice.pause();
          setIsPaused(true);
          setIsSpeaking(false);
        } catch {
          // ignore
        }
        return;
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setIsSpeaking(false);
      } catch {
        // ignore
      }
    }
  }, []);

  const resume = useCallback(() => {
    unlockAudioEngine();

    if (activeModeRef.current === 'cloud' && audioRef.current) {
      try {
        audioRef.current.play();
        setIsPaused(false);
        setIsSpeaking(true);
      } catch {
        speak();
      }
      return;
    }

    if (activeModeRef.current === 'responsive') {
      const win = window as unknown as { responsiveVoice?: { resume: () => void } };
      if (win.responsiveVoice && typeof win.responsiveVoice.resume === 'function') {
        try {
          win.responsiveVoice.resume();
          setIsPaused(false);
          setIsSpeaking(true);
        } catch {
          speak();
        }
        return;
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
          setIsSpeaking(true);
        } else {
          speak();
        }
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
