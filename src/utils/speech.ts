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

export function useSpeech({
  textToSpeak,
  speechRate,
  voiceURI,
  isMuted,
  autoAdvance,
  onSpeechEnd,
}: UseSpeechProps) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    let availableVoices = window.speechSynthesis.getVoices();
    if (!availableVoices || availableVoices.length === 0) {
      // Retry after a short tick for browsers that load voices asynchronously
      setTimeout(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          availableVoices = window.speechSynthesis.getVoices();
          if (availableVoices && availableVoices.length > 0) {
            const mapped: VoiceOption[] = availableVoices.map((v) => ({
              voiceURI: v.voiceURI || v.name,
              name: v.name,
              lang: v.lang,
              isLocalService: v.localService,
              default: v.default,
            }));
            setVoices(mapped);
          }
        }
      }, 200);
      return;
    }

    const mapped: VoiceOption[] = availableVoices.map((v) => ({
      voiceURI: v.voiceURI || v.name,
      name: v.name,
      lang: v.lang,
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

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
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

      // Reset speech synthesis state
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }

      const text = customText || textToSpeak;
      if (!text || text.trim().length === 0) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.5, Math.min(1.5, speechRateRef.current));

      // Determine voice
      let voiceToUse = selectedVoice;
      if (customVoiceURI) {
        const availableVoices = window.speechSynthesis.getVoices();
        const found = availableVoices.find(
          (v) => (v.voiceURI && v.voiceURI === customVoiceURI) || v.name === customVoiceURI
        );
        if (found) voiceToUse = found;
      }

      if (!voiceToUse) {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          voiceToUse =
            available.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
            available.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
            available.find((v) => v.lang.startsWith('en') && v.default) ||
            available.find((v) => v.lang.startsWith('en')) ||
            available[0];
        }
      }

      if (voiceToUse) {
        utterance.voice = voiceToUse;
        utterance.lang = voiceToUse.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      // Crucial iOS Safari WebKit Fix: Attach utterance to global window object
      // so garbage collection does not cut off speech prematurely on mobile!
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

      // Ensure speech synthesis is resumed before speak
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Failed to call speak:', err);
      }
    },
    [textToSpeak, selectedVoice]
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
    speak,
    pause,
    resume,
    stop,
    testVoice,
  };
}
