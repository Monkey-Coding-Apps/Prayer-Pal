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

const DEFAULT_FALLBACK_VOICE: VoiceOption = {
  voiceURI: 'default-system-voice',
  name: 'Default System Voice (Device Engine)',
  lang: 'en-US',
  isLocalService: true,
  default: true,
};

export function useSpeech({
  textToSpeak,
  speechRate,
  voiceURI,
  isMuted,
  autoAdvance,
  onSpeechEnd,
}: UseSpeechProps) {
  const [voices, setVoices] = useState<VoiceOption[]>([DEFAULT_FALLBACK_VOICE]);
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
      setVoices([DEFAULT_FALLBACK_VOICE]);
      return;
    }

    let availableVoices: SpeechSynthesisVoice[] = [];
    try {
      availableVoices = window.speechSynthesis.getVoices() || [];
    } catch {
      availableVoices = [];
    }

    if (!availableVoices || availableVoices.length === 0) {
      setVoices([DEFAULT_FALLBACK_VOICE]);
      return;
    }

    const mapped: VoiceOption[] = availableVoices.map((v) => ({
      voiceURI: v.voiceURI || v.name,
      name: v.name,
      lang: v.lang || 'en-US',
      isLocalService: v.localService,
      default: v.default,
    }));

    setVoices(mapped);

    // Match selected voice
    let matched: SpeechSynthesisVoice | undefined;
    if (voiceURI) {
      matched = availableVoices.find(
        (v) => (v.voiceURI && v.voiceURI === voiceURI) || v.name === voiceURI
      );
    }

    if (!matched) {
      // Preferred English voices (natural or default)
      matched =
        availableVoices.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
        availableVoices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        availableVoices.find((v) => v.lang.startsWith('en') && v.default) ||
        availableVoices.find((v) => v.lang.startsWith('en')) ||
        availableVoices[0];
    }

    setSelectedVoice(matched || null);
  }, [voiceURI]);

  // Persistent voice loader polling for Android WebView / APK compatibility
  useEffect(() => {
    loadVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Poll every 400ms for up to 10 seconds to catch delayed Android TTS initialization
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
      if (attempts >= 25) {
        clearInterval(interval);
      }
    }, 400);

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

      // Attempt voice refresh if list is currently default
      let currentAvailable: SpeechSynthesisVoice[] = [];
      try {
        currentAvailable = window.speechSynthesis.getVoices() || [];
      } catch {
        currentAvailable = [];
      }

      // Determine voice to use
      let voiceToUse = selectedVoice;
      const targetURI = customVoiceURI || voiceURI;

      if (currentAvailable.length > 0) {
        if (targetURI) {
          voiceToUse =
            currentAvailable.find(
              (v) => (v.voiceURI && v.voiceURI === targetURI) || v.name === targetURI
            ) || null;
        }

        if (!voiceToUse) {
          voiceToUse =
            currentAvailable.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
            currentAvailable.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
            currentAvailable.find((v) => v.lang.startsWith('en') && v.default) ||
            currentAvailable.find((v) => v.lang.startsWith('en')) ||
            currentAvailable[0] ||
            null;
        }
      }

      // Prepare speech execution function
      const executeSpeak = () => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = Math.max(0.5, Math.min(1.5, speechRateRef.current));
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          if (voiceToUse) {
            utterance.voice = voiceToUse;
            utterance.lang = voiceToUse.lang || 'en-US';
          } else {
            utterance.lang = 'en-US';
          }

          // Crucial Android WebView / WebKit GC Fix: Keep reference on global window
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
        } catch (err) {
          console.warn('Failed to execute speak:', err);
          setIsSpeaking(false);
          setIsPaused(false);
        }
      };

      // Safely cancel active or pending synthesis before speaking
      // microtick delay ensures Android Chromium IPC cancel doesn't discard the new utterance!
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
        setTimeout(executeSpeak, 40);
      } else {
        executeSpeak();
      }
    },
    [textToSpeak, selectedVoice, voiceURI]
  );

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
        setIsPaused(true);
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
