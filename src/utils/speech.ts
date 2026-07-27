import { useCallback, useEffect, useRef, useState } from 'react';
import { unlockAudioEngine } from './audioChime';

export interface VoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isLocalService: boolean;
  default: boolean;
}

export interface UseSpeechProps {
  textToSpeak: string;
  speechRate: number; // 0.7 to 1.1
  voiceURI: string | null;
  isMuted: boolean;
  autoAdvance: boolean;
  onSpeechEnd?: () => void;
}

const DEFAULT_SYSTEM_VOICE: VoiceOption = {
  voiceURI: 'default-system-voice',
  name: 'Default System Voice (Device Engine)',
  lang: 'en-US',
  isLocalService: true,
  default: true,
};

const PRESET_VOICES: VoiceOption[] = [
  DEFAULT_SYSTEM_VOICE,
  {
    voiceURI: 'preset-en-us',
    name: 'English (United States)',
    lang: 'en-US',
    isLocalService: true,
    default: false,
  },
  {
    voiceURI: 'preset-en-gb',
    name: 'English (United Kingdom)',
    lang: 'en-GB',
    isLocalService: true,
    default: false,
  },
  {
    voiceURI: 'preset-la',
    name: 'Latin (Ecclesiastical)',
    lang: 'la',
    isLocalService: true,
    default: false,
  },
  {
    voiceURI: 'preset-es-es',
    name: 'Spanish (Español)',
    lang: 'es-ES',
    isLocalService: true,
    default: false,
  },
];

export function useSpeech({
  textToSpeak,
  speechRate,
  voiceURI,
  isMuted,
  autoAdvance,
  onSpeechEnd,
}: UseSpeechProps) {
  const [voices, setVoices] = useState<VoiceOption[]>(PRESET_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasAudioUnlocked, setHasAudioUnlocked] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
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

  // Immediately stop speech whenever isMuted becomes true
  useEffect(() => {
    if (isMuted) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isMuted]);

  // Load and map available system voices
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoices(PRESET_VOICES);
      return;
    }

    let availableVoices: SpeechSynthesisVoice[] = [];
    try {
      availableVoices = window.speechSynthesis.getVoices() || [];
    } catch {
      availableVoices = [];
    }

    if (!availableVoices || availableVoices.length === 0) {
      setVoices(PRESET_VOICES);
      return;
    }

    const systemMapped: VoiceOption[] = availableVoices.map((v) => ({
      voiceURI: v.voiceURI || v.name,
      name: v.name || 'System Voice',
      lang: v.lang || 'en-US',
      isLocalService: v.localService,
      default: v.default,
    }));

    const combined: VoiceOption[] = [DEFAULT_SYSTEM_VOICE, ...systemMapped];
    setVoices(combined);

    // Match selected voice if specific URI
    if (voiceURI && voiceURI !== 'default-system-voice' && !voiceURI.startsWith('preset-')) {
      const matched = availableVoices.find(
        (v) => (v.voiceURI && v.voiceURI === voiceURI) || v.name === voiceURI
      );
      setSelectedVoice(matched || null);
    } else {
      setSelectedVoice(null);
    }
  }, [voiceURI]);

  // Persistent voice loader polling for Android WebView / APK initialization
  useEffect(() => {
    loadVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Poll every 500ms for up to 10 seconds to detect Android TTS initialization
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices && currentVoices.length > 0) {
          loadVoices();
          clearInterval(interval);
        }
      }
      if (attempts >= 20) {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  // Stop speech synthesis
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setIsSpeaking(false);
    setIsPaused(false);
    if (typeof window !== 'undefined') {
      delete (window as unknown as { __activeUtterance?: unknown }).__activeUtterance;
    }
  }, []);

  const speak = useCallback(
    (customText?: string, customVoiceURI?: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMutedRef.current) {
        return;
      }

      // Unlock mobile audio context
      unlockAudioEngine();
      setHasAudioUnlocked(true);

      const text = customText || textToSpeak;
      if (!text || text.trim().length === 0) return;

      // Determine target voice and language
      const targetURI = customVoiceURI || voiceURI || 'default-system-voice';

      let voiceToUse: SpeechSynthesisVoice | null = null;
      let targetLang = 'en-US';

      if (targetURI.startsWith('preset-')) {
        targetLang = targetURI.replace('preset-', '');
        if (targetLang === 'la') targetLang = 'la';
        if (targetLang === 'es-es') targetLang = 'es-ES';
      } else if (targetURI !== 'default-system-voice') {
        let currentAvailable: SpeechSynthesisVoice[] = [];
        try {
          currentAvailable = window.speechSynthesis.getVoices() || [];
        } catch {
          currentAvailable = [];
        }

        if (currentAvailable.length > 0) {
          voiceToUse =
            currentAvailable.find(
              (v) => (v.voiceURI && v.voiceURI === targetURI) || v.name === targetURI
            ) || null;
          if (voiceToUse) {
            targetLang = voiceToUse.lang || 'en-US';
          }
        }
      }

      const executeSpeak = () => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = Math.max(0.6, Math.min(1.3, speechRateRef.current));
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = targetLang;

          if (voiceToUse) {
            utterance.voice = voiceToUse;
          }

          // Crucial Android WebView / WebKit GC Fix: Keep reference on global window object
          (window as unknown as { __activeUtterance?: SpeechSynthesisUtterance }).__activeUtterance = utterance;

          utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
            delete (window as unknown as { __activeUtterance?: unknown }).__activeUtterance;
            if (autoAdvanceRef.current && onSpeechEndRef.current) {
              onSpeechEndRef.current();
            }
          };

          utterance.onerror = (e) => {
            console.warn('Speech synthesis error:', e);
            setIsSpeaking(false);
            setIsPaused(false);
            delete (window as unknown as { __activeUtterance?: unknown }).__activeUtterance;
          };

          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);

          setIsSpeaking(true);
          setIsPaused(false);
        } catch (err) {
          console.warn('Failed to execute speak:', err);
          setIsSpeaking(false);
          setIsPaused(false);
        }
      };

      // In Android WebView, calling window.speechSynthesis.cancel() in the same frame as speak()
      // will cancel the new utterance. Only cancel if currently speaking/pending!
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
        setTimeout(executeSpeak, 60);
      } else {
        executeSpeak();
      }
    },
    [textToSpeak, voiceURI]
  );

  const pause = useCallback(() => {
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        unlockAudioEngine();
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
