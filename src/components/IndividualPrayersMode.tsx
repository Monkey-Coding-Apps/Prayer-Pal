import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PRAYERS } from '../data/prayers';
import { Prayer, PrayerId, RosaryConfig } from '../types';
import { useSpeech } from '../utils/speech';
import { unlockAudioEngine } from '../utils/audioChime';
import { AudioToolbar } from './AudioToolbar';
import {
  BookOpen,
  Search,
  ChevronRight,
  Globe,
} from 'lucide-react';

interface IndividualPrayersModeProps {
  config: RosaryConfig;
  onUpdateConfig: (updater: (prev: RosaryConfig) => RosaryConfig) => void;
}

export const IndividualPrayersMode: React.FC<IndividualPrayersModeProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [selectedPrayerId, setSelectedPrayerId] = useState<PrayerId>('jesus_prayer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showLatinText, setShowLatinText] = useState(false);

  const prayersList = Object.values(PRAYERS);

  const categories = ['All', 'Essential', 'Rosary', 'Devotional', 'Marian'];

  const filteredPrayers = prayersList.filter((prayer) => {
    const matchesSearch =
      prayer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prayer.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || prayer.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activePrayer: Prayer = PRAYERS[selectedPrayerId] || PRAYERS.jesus_prayer;

  // Speech hook for individual prayer
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
    textToSpeak: showLatinText && activePrayer.latinText ? activePrayer.latinText : activePrayer.text,
    speechRate: config.speechRate,
    voiceURI: config.voiceURI,
    isMuted: config.isAudioMuted,
    autoAdvance: false,
  });

  const fontSizeClasses = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-relaxed',
    lg: 'text-lg sm:text-xl leading-relaxed',
    xl: 'text-xl sm:text-2xl leading-relaxed',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#5a5a40] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#d1d1c1] text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-[#8c7b5b]" />
            Standalone Prayer Library
          </span>
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-wide text-white">
            Individual Catholic Prayers
          </h2>
          <p className="text-[#d1d1c1] text-xs sm:text-sm max-w-lg leading-relaxed">
            Pick and recite single prayers anytime with customizable Text-to-Speech narration and optional Latin translations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Prayer Menu & Search */}
        <div className="md:col-span-5 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8c7b5b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prayers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/80 dark:bg-[#20201a] border border-[#d1d1c1] dark:border-[#38382f] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#2c2c24] dark:text-[#e8e8e0] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#5a5a40] text-white shadow-sm'
                    : 'bg-white/80 dark:bg-[#20201a] border border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#c5c5b5] hover:border-[#5a5a40]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Prayer List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredPrayers.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8c7b5b]">
                No prayers found matching your filter.
              </div>
            ) : (
              filteredPrayers.map((prayer) => {
                const isSelected = selectedPrayerId === prayer.id;
                return (
                  <button
                    key={prayer.id}
                    type="button"
                    onClick={() => {
                      stop();
                      setSelectedPrayerId(prayer.id);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#5a5a40]/15 dark:bg-[#5a5a40]/30 border-[#5a5a40] text-[#2c2c24] dark:text-[#e8e8e0] ring-2 ring-[#5a5a40]/30 font-semibold'
                        : 'bg-white/80 dark:bg-[#20201a] border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#c5c5b5] hover:border-[#5a5a40]'
                    }`}
                  >
                    <div>
                      <div className="font-cinzel font-bold text-sm text-[#2c2c24] dark:text-[#e8e8e0]">
                        {prayer.title}
                      </div>
                      <div className="text-[10px] text-[#8c7b5b] dark:text-[#a09070] line-clamp-1 mt-0.5">
                        {prayer.description || prayer.text}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isSelected ? 'text-[#5a5a40] translate-x-0.5' : 'text-[#d1d1c1]'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Prayer Recital Card & Audio Controls */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-white/90 dark:bg-[#20201a] border-2 border-[#d1d1c1] dark:border-[#38382f] rounded-3xl p-6 sm:p-8 shadow-md space-y-4">
            {/* Title & Category Badge */}
            <div className="flex items-start justify-between gap-3 border-b border-[#d1d1c1]/60 dark:border-[#38382f] pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c7b5b] dark:text-[#a09070] font-cinzel">
                  {activePrayer.category} Prayer
                </span>
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-[#2c2c24] dark:text-[#e8e8e0] mt-0.5">
                  {activePrayer.title}
                </h3>
              </div>

              {/* Latin Translation Toggle if available */}
              {activePrayer.latinText && (
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    setShowLatinText(!showLatinText);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    showLatinText
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                      : 'bg-white dark:bg-[#2a2a22] border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#c5c5b5]'
                  }`}
                  title="Toggle Latin Translation"
                >
                  <Globe className="w-3.5 h-3.5 text-[#8c7b5b]" />
                  <span>{showLatinText ? 'Latin' : 'English'}</span>
                </button>
              )}
            </div>

            {/* Description */}
            {activePrayer.description && (
              <p className="text-xs text-[#5a5a40] dark:text-[#c5c5a5] italic bg-[#f5f5f0] dark:bg-[#2a2a22] p-3 rounded-2xl border border-[#d1d1c1]/50">
                {activePrayer.description}
              </p>
            )}

            {/* Prayer Text */}
            <div
              className={`font-playfair text-[#2c2c24] dark:text-[#e8e8e0] ${fontSizeClasses[config.fontSize]}`}
            >
              {showLatinText && activePrayer.latinText
                ? activePrayer.latinText
                : activePrayer.text}
            </div>
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
              unlockAudioEngine();
              if (isPaused) resume();
              else
                speak(
                  showLatinText && activePrayer.latinText
                    ? activePrayer.latinText
                    : activePrayer.text
                );
            }}
            onPause={pause}
            onReset={stop}
            autoAdvance={false}
            onToggleAutoAdvance={() => {}}
            speechRate={config.speechRate}
            onChangeSpeechRate={(rate) =>
              onUpdateConfig((prev) => ({ ...prev, speechRate: rate }))
            }
            onTestVoice={testVoice}
            onReloadVoices={loadVoices}
          />
        </div>
      </div>
    </div>
  );
};
