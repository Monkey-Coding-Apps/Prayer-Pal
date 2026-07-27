import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RosaryConfig, RosaryStep } from '../types';
import { generateRosarySequence } from '../utils/rosarySequence';
import { useSpeech } from '../utils/speech';
import { playSacredChime, unlockAudioEngine } from '../utils/audioChime';
import { BeadIndicator } from './BeadIndicator';
import { AudioToolbar } from './AudioToolbar';
import { MysterySelector } from './MysterySelector';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Play,
  Layers,
  Heart,
} from 'lucide-react';

interface GuidedRosaryModeProps {
  config: RosaryConfig;
  onUpdateConfig: (updater: (prev: RosaryConfig) => RosaryConfig) => void;
}

export const GuidedRosaryMode: React.FC<GuidedRosaryModeProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [isPlayingRosary, setIsPlayingRosary] = useState(false);
  const [sequence, setSequence] = useState<RosaryStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Generate sequence whenever decade count or mystery changes
  const initSequence = useCallback(() => {
    const steps = generateRosarySequence(config.decadeCount, config.mysteryType);
    setSequence(steps);
    setCurrentStepIndex(0);
  }, [config.decadeCount, config.mysteryType]);

  useEffect(() => {
    initSequence();
  }, [initSequence]);

  const currentStep: RosaryStep | undefined = sequence[currentStepIndex];

  // Speech API hook
  const {
    voices,
    isSpeaking,
    isPaused,
    loadVoices,
    speak,
    pause,
    resume,
    stop,
    testVoice,
  } = useSpeech({
    textToSpeak: currentStep ? currentStep.text : '',
    speechRate: config.speechRate,
    voiceURI: config.voiceURI,
    isMuted: config.isAudioMuted,
    autoAdvance: config.autoAdvance,
    onSpeechEnd: () => {
      // If autoAdvance is enabled and not at end
      if (currentStepIndex < sequence.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    },
  });

  // Automatically trigger speech & soft chime when step changes if playing rosary & unmuted
  useEffect(() => {
    if (isPlayingRosary && currentStep && !config.isAudioMuted) {
      playSacredChime(432, 1.2);
      const timer = setTimeout(() => {
        speak(currentStep.text);
      }, 250);
      return () => clearTimeout(timer);
    } else if (!isPlayingRosary) {
      stop();
    }
  }, [currentStepIndex, isPlayingRosary, config.isAudioMuted, speak, stop, currentStep]);

  // Step Navigation handlers
  const handleNextStep = () => {
    unlockAudioEngine();
    stop();
    if (currentStepIndex < sequence.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    unlockAudioEngine();
    stop();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleJumpToBead = (beadNum: number) => {
    if (!currentStep) return;
    unlockAudioEngine();
    stop();
    // Find step index in sequence matching decade & beadIndex
    const targetIdx = sequence.findIndex(
      (s) =>
        s.decadeNumber === currentStep.decadeNumber &&
        s.prayerId === 'hail_mary' &&
        s.beadIndex === beadNum
    );
    if (targetIdx !== -1) {
      setCurrentStepIndex(targetIdx);
    }
  };

  const handleStartRosary = () => {
    unlockAudioEngine();
    initSequence();
    setIsPlayingRosary(true);
  };

  const handleResetRosary = () => {
    unlockAudioEngine();
    stop();
    setCurrentStepIndex(0);
    setIsPlayingRosary(false);
  };

  // Font size mapping for prayer card text
  const fontSizeClasses = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-relaxed',
    lg: 'text-lg sm:text-xl leading-relaxed',
    xl: 'text-xl sm:text-2xl leading-relaxed',
  };

  // Setup / Mode Configuration view
  if (!isPlayingRosary) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4 animate-fade-in">
        {/* Banner */}
        <div className="bg-[#5a5a40] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#d1d1c1] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#8c7b5b]" />
              Interactive Guided Mode
            </span>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-wide text-white">
              Prepare Your Heart & Rosary
            </h2>
            <p className="text-[#d1d1c1] text-xs sm:text-sm max-w-lg leading-relaxed">
              Select your desired number of decades and daily mysteries. The audio narrator will guide your prayer step-by-step.
            </p>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="bg-white/80 dark:bg-[#20201a] border border-[#d1d1c1] dark:border-[#38382f] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Decade Count Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#5a5a40] dark:text-[#c5c5a5] font-cinzel flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#8c7b5b]" />
                <span>Choose Number of Decades</span>
              </label>
              <span className="text-xs font-bold text-[#8c7b5b] dark:text-[#a09070]">
                {config.decadeCount === 5 ? '5 Decades (Full Rosary)' : `${config.decadeCount} Decade${config.decadeCount > 1 ? 's' : ''} (Quick)`}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as const).map((count) => {
                const isSelected = config.decadeCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() =>
                      onUpdateConfig((prev) => ({ ...prev, decadeCount: count }))
                    }
                    className={`py-3.5 rounded-2xl font-bold text-sm sm:text-base border transition-all ${
                      isSelected
                        ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-md shadow-[#5a5a40]/30 ring-2 ring-[#5a5a40]/30'
                        : 'bg-white dark:bg-[#282822] border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-[#f5f5f0]'
                    }`}
                  >
                    {count}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-[#8c7b5b] dark:text-[#a09070] italic">
              {config.decadeCount === 5
                ? 'Includes opening Apostles\' Creed, introductory Our Father & 3 Hail Marys.'
                : 'Quick mode: starts with Sign of the Cross and proceeds straight into the decade loop.'}
            </p>
          </div>

          {/* Mystery Selector */}
          <MysterySelector
            selectedType={config.mysteryType}
            onSelectType={(type) =>
              onUpdateConfig((prev) => ({ ...prev, mysteryType: type }))
            }
          />

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartRosary}
            className="w-full py-4 bg-[#5a5a40] hover:bg-[#484833] text-white font-bold font-cinzel text-base rounded-full shadow-lg shadow-[#5a5a40]/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Begin Guided Rosary</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Guided Player View
  const progressPercent = sequence.length > 0 ? Math.round(((currentStepIndex + 1) / sequence.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-2">
      {/* Top Bar: Back to setup & Progress summary */}
      <div className="flex items-center justify-between text-xs font-semibold text-[#5a5a40] dark:text-[#c5c5a5]">
        <button
          type="button"
          onClick={handleResetRosary}
          className="flex items-center gap-1 hover:text-[#8c7b5b] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#8c7b5b]" />
          <span>Exit & Configure</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-cinzel text-[#2c2c24] dark:text-[#e8e8e0] font-bold">
            Step {currentStepIndex + 1} of {sequence.length}
          </span>
          <span className="bg-[#5a5a40]/10 dark:bg-[#5a5a40]/30 text-[#5a5a40] dark:text-[#c5c5a5] px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#5a5a40]/20">
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-[#d1d1c1]/50 dark:bg-[#2e2e26] h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-[#5a5a40] h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 10 Bead Visual Indicator (Shown for Decade Hail Marys and Our Fathers) */}
      <BeadIndicator
        currentBeadIndex={currentStep?.beadIndex}
        currentDecadeNumber={currentStep?.decadeNumber}
        totalDecades={currentStep?.totalDecades || config.decadeCount}
        onSelectBead={handleJumpToBead}
      />

      {/* Active Mystery Banner */}
      {currentStep?.mysteryTitle && (
        <div className="bg-[#5a5a40]/10 dark:bg-[#5a5a40]/20 border border-[#5a5a40]/20 rounded-2xl p-4 text-xs text-[#2c2c24] dark:text-[#e8e8e0] space-y-1">
          <div className="flex items-center justify-between font-cinzel font-bold text-sm text-[#5a5a40] dark:text-[#c5c5a5]">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#8c7b5b] fill-[#8c7b5b]/20" />
              <span>{currentStep.mysteryTitle}</span>
            </span>
            {currentStep.mysteryFruit && (
              <span className="text-[11px] font-sans font-medium px-2.5 py-0.5 bg-[#8c7b5b]/20 rounded-full text-[#5a5a40] dark:text-[#d0c0a0]">
                Fruit: {currentStep.mysteryFruit}
              </span>
            )}
          </div>
          {currentStep.mysteryMeditation && (
            <p className="text-[#4a4a3f] dark:text-[#c5c5b5] italic font-serif pt-1">
              "{currentStep.mysteryMeditation}"
            </p>
          )}
        </div>
      )}

      {/* Main Interactive Prayer Card */}
      <AnimatePresence mode="wait">
        {currentStep && (
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onClick={handleNextStep}
            className="group relative bg-white/90 dark:bg-[#20201a] border-2 border-[#d1d1c1] dark:border-[#38382f] hover:border-[#5a5a40] dark:hover:border-[#8c7b5b] rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-lg transition-all cursor-pointer select-none space-y-4"
          >
            {/* Step Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#d1d1c1]/60 dark:border-[#38382f] pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c7b5b] dark:text-[#a09070] font-cinzel block">
                  {currentStep.subTitle || 'Prayer Step'}
                </span>
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-[#2c2c24] dark:text-[#e8e8e0] mt-0.5">
                  {currentStep.title}
                </h3>
              </div>

              {/* Tap to advance badge */}
              <span className="text-[10px] font-semibold text-[#8c7b5b] dark:text-[#a09070] bg-[#f5f5f0] dark:bg-[#2a2a22] px-3 py-1 rounded-full flex items-center gap-1 group-hover:text-[#5a5a40] dark:group-hover:text-[#e8e8e0] transition-colors border border-[#d1d1c1]/50">
                <span>Tap card to advance</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            {/* Instruction Callout */}
            {currentStep.instruction && (
              <p className="text-xs text-[#5a5a40] dark:text-[#c5c5a5] bg-[#f5f5f0] dark:bg-[#2a2a22] p-3 rounded-2xl border border-[#d1d1c1]/50 italic">
                {currentStep.instruction}
              </p>
            )}

            {/* Prayer Text */}
            <div className={`font-playfair text-[#2c2c24] dark:text-[#e8e8e0] ${fontSizeClasses[config.fontSize]}`}>
              {currentStep.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
          className={`py-3 px-4 rounded-full font-semibold text-xs sm:text-sm border flex items-center justify-center gap-1.5 transition-all ${
            currentStepIndex === 0
              ? 'bg-[#d1d1c1]/30 dark:bg-[#2a2a22] border-[#d1d1c1] dark:border-[#38382f] text-[#8c7b5b] cursor-not-allowed'
              : 'bg-white dark:bg-[#20201a] border-[#d1d1c1] dark:border-[#38382f] text-[#2c2c24] dark:text-[#e8e8e0] hover:bg-[#f5f5f0]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <button
          type="button"
          onClick={() => {
            stop();
            if (currentStep) speak(currentStep.text);
          }}
          className="py-3 px-4 rounded-full font-semibold text-xs sm:text-sm bg-white dark:bg-[#20201a] border border-[#d1d1c1] dark:border-[#38382f] text-[#5a5a40] dark:text-[#c5c5a5] hover:bg-[#f5f5f0] flex items-center justify-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#8c7b5b]" />
          <span>Repeat Prayer</span>
        </button>

        <button
          type="button"
          onClick={handleNextStep}
          disabled={currentStepIndex === sequence.length - 1}
          className={`py-3 px-4 rounded-full font-bold text-xs sm:text-sm border flex items-center justify-center gap-1.5 transition-all shadow-sm ${
            currentStepIndex === sequence.length - 1
              ? 'bg-[#d1d1c1]/30 dark:bg-[#2a2a22] border-[#d1d1c1] dark:border-[#38382f] text-[#8c7b5b] cursor-not-allowed'
              : 'bg-[#5a5a40] hover:bg-[#484833] text-white border-[#5a5a40]'
          }`}
        >
          <span>Next Step</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Integrated Audio Toolbar */}
      <AudioToolbar
        voices={voices}
        selectedVoiceURI={config.voiceURI}
        onSelectVoice={(uri) =>
          onUpdateConfig((prev) => ({ ...prev, voiceURI: uri }))
        }
        isMuted={config.isAudioMuted}
        onToggleMute={() =>
          onUpdateConfig((prev) => ({ ...prev, isAudioMuted: !prev.isAudioMuted }))
        }
        isSpeaking={isSpeaking}
        isPaused={isPaused}
        onPlay={() => {
          if (isPaused) resume();
          else if (currentStep) speak(currentStep.text);
        }}
        onPause={pause}
        onReset={stop}
        autoAdvance={config.autoAdvance}
        onToggleAutoAdvance={() =>
          onUpdateConfig((prev) => ({ ...prev, autoAdvance: !prev.autoAdvance }))
        }
        speechRate={config.speechRate}
        onChangeSpeechRate={(rate) =>
          onUpdateConfig((prev) => ({ ...prev, speechRate: rate }))
        }
        onTestVoice={testVoice}
        onReloadVoices={loadVoices}
      />
    </div>
  );
};
