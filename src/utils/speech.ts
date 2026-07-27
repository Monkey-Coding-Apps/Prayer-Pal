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

export const CLOUD_VOICES: VoiceOption[] = [
  {
    voiceURI: 'cloud-en-us',
    name: 'Google Voice (US English)',
    lang: 'en',
    isLocalService: false,
    default: true,
  },
  {
    voiceURI: 'cloud-en-gb',
    name: 'Google Voice (UK English)',
    lang: 'en-GB',
    isLocalService: false,
    default: false,
  },
  {
    voiceURI: 'cloud-en-au',
    name: 'Google Voice (Australian)',
    lang: 'en-AU',
    isLocalService: false,
    default: false,
  },
  {
    voiceURI: 'cloud-la',
    name: 'Google Voice (Latin - Ecclesiastical)',
    lang: 'la',
    isLocalService: false,
    default: false,
  },
  {
    voiceURI: 'cloud-es',
    name: 'Google Voice (Spanish)',
    lang: 'es',
    isLocalService: false,
    default: false,
  },
];

function splitTextIntoChunks(text: string, maxLen = 130): string[] {
  if (!text) return [];
  // Split by sentence punctuation or line breaks
  const rawSentences = text.match(/[^.!?;\n]+[.!?;\n]*/g) || [text];
  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
    } else {
      // Split longer sentences by commas or colons
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
  const [voices, setVoices] = useState<VoiceOption[]>(CLOUD_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasAudioUnlocked, setHasAudioUnlocked] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingCloudRef = useRef<boolean>(false);
  const cloudQueueRef = useRef<string[]>([]);
  const cloudIndexRef = useRef<number>(0);
  const cloudLangRef = useRef<string>('en');

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

  // Stop cloud audio helper
  const stopCloudAudio = useCallback(() => {
    isPlayingCloudRef.current = false;
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
      activeAudioRef.current = null;
    }
    cloudQueueRef.current = [];
    cloudIndexRef.current = 0;
  }, []);

  // Stop system speech helper
  const stopSystemSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined') {
      delete (window as unknown as { __activeUtterance?: unknown }).__activeUtterance;
    }
  }, []);

  // Overall stop speech
  const stop = useCallback(() => {
    stopCloudAudio();
    stopSystemSpeech();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [stopCloudAudio, stopSystemSpeech]);

  // Immediately stop speech whenever isMuted becomes true
  useEffect(() => {
    if (isMuted) {
      stop();
    }
  }, [isMuted, stop]);

  // Load and map available system voices + merge with Cloud Voices
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
      name: v.name || 'Device System Voice',
      lang: v.lang || 'en-US',
      isLocalService: v.localService,
      default: v.default,
    }));

    // Merge Cloud Voices with System Voices
    const combined: VoiceOption[] = [...CLOUD_VOICES, ...systemMapped];
    setVoices(combined);

    // Match selected voice
    if (voiceURI) {
      const matchedSystem = availableVoices.find(
        (v) => (v.voiceURI && v.voiceURI === voiceURI) || v.name === voiceURI
      );
      setSelectedVoice(matchedSystem || null);
    }
  }, [voiceURI]);

  // Persistent voice loader polling
  useEffect(() => {
    loadVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices && currentVoices.length > 0) {
          loadVoices();
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadVoices]);

  // Play Cloud Audio Chunks function
  const playCloudAudio = useCallback(
    (textToPlay: string, langToUse: string) => {
      stopCloudAudio();
      stopSystemSpeech();

      if (isMutedRef.current || !textToPlay || textToPlay.trim().length === 0) return;

      const chunks = splitTextIntoChunks(textToPlay);
      if (!chunks || chunks.length === 0) return;

      cloudQueueRef.current = chunks;
      cloudIndexRef.current = 0;
      cloudLangRef.current = langToUse || 'en';
      isPlayingCloudRef.current = true;

      setIsSpeaking(true);
      setIsPaused(false);

      const playNextChunk = () => {
        if (!isPlayingCloudRef.current) return;

        if (cloudIndexRef.current >= cloudQueueRef.current.length) {
          isPlayingCloudRef.current = false;
          setIsSpeaking(false);
          setIsPaused(false);
          activeAudioRef.current = null;
          if (autoAdvanceRef.current && onSpeechEndRef.current) {
            onSpeechEndRef.current();
          }
          return;
        }

        const chunk = cloudQueueRef.current[cloudIndexRef.current];
        const encoded = encodeURIComponent(chunk);
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${encodeURIComponent(cloudLangRef.current)}&client=tw-ob`;

        const audio = new Audio(audioUrl);
        audio.playbackRate = Math.max(0.75, Math.min(1.25, speechRateRef.current));
        activeAudioRef.current = audio;

        audio.onended = () => {
          cloudIndexRef.current++;
          playNextChunk();
        };

        audio.onerror = (e) => {
          console.warn('Cloud audio playback error, moving to next chunk:', e);
          cloudIndexRef.current++;
          playNextChunk();
        };

        audio.play().catch((err) => {
          console.warn('Failed to start cloud audio chunk:', err);
          cloudIndexRef.current++;
          playNextChunk();
        });
      };

      playNextChunk();
    },
    [stopCloudAudio, stopSystemSpeech]
  );

  const speak = useCallback(
    (customText?: string, customVoiceURI?: string) => {
      if (isMutedRef.current) return;

      unlockAudioEngine();
      setHasAudioUnlocked(true);

      const text = customText || textToSpeak;
      if (!text || text.trim().length === 0) return;

      const targetURI = customVoiceURI || voiceURI || 'cloud-en-us';

      // Check if target voice is a Cloud Voice
      const cloudOption = CLOUD_VOICES.find((cv) => cv.voiceURI === targetURI);
      if (cloudOption) {
        playCloudAudio(text, cloudOption.lang);
        return;
      }

      // If target voice is not a Cloud Voice, try System SpeechSynthesis
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        // Fallback to Cloud Audio
        playCloudAudio(text, 'en');
        return;
      }

      let currentAvailable: SpeechSynthesisVoice[] = [];
      try {
        currentAvailable = window.speechSynthesis.getVoices() || [];
      } catch {
        currentAvailable = [];
      }

      // If system voices are empty (e.g. Android APK WebView), fallback to Cloud Audio!
      if (!currentAvailable || currentAvailable.length === 0) {
        playCloudAudio(text, 'en');
        return;
      }

      let matchedVoice = currentAvailable.find(
        (v) => (v.voiceURI && v.voiceURI === targetURI) || v.name === targetURI
      );

      if (!matchedVoice) {
        matchedVoice =
          currentAvailable.find((v) => v.lang.startsWith('en') && v.default) ||
          currentAvailable.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          currentAvailable[0];
      }

      const doSystemSpeak = () => {
        try {
          stopCloudAudio();
          stopSystemSpeech();

          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = Math.max(0.7, Math.min(1.2, speechRateRef.current));
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          if (matchedVoice) {
            utterance.voice = matchedVoice;
            utterance.lang = matchedVoice.lang || 'en-US';
          } else {
            utterance.lang = 'en-US';
          }

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
            console.warn('Speech synthesis error, falling back to Cloud Voice:', e);
            delete (window as unknown as { __activeUtterance?: unknown }).__activeUtterance;
            playCloudAudio(text, 'en');
          };

          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);

          setIsSpeaking(true);
          setIsPaused(false);
        } catch (err) {
          console.warn('System speak failed, falling back to Cloud Voice:', err);
          playCloudAudio(text, 'en');
        }
      };

      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
        setTimeout(doSystemSpeak, 100);
      } else {
        doSystemSpeak();
      }
    },
    [textToSpeak, voiceURI, playCloudAudio, stopCloudAudio, stopSystemSpeech]
  );

  const pause = useCallback(() => {
    if (isPlayingCloudRef.current && activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        setIsPaused(true);
        setIsSpeaking(false);
      } catch {
        // ignore
      }
      return;
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

    if (isPlayingCloudRef.current && activeAudioRef.current) {
      try {
        activeAudioRef.current.play();
        setIsPaused(false);
        setIsSpeaking(true);
      } catch {
        speak();
      }
      return;
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
