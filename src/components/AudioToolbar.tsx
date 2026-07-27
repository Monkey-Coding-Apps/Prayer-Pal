import React, { useState } from 'react';
import {
  Volume2,
  Volume1,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronDown,
  Gauge,
  Mic,
  Bell,
} from 'lucide-react';
import { VoiceOption } from '../utils/speech';
import { playSacredChime, unlockAudioEngine } from '../utils/audioChime';

interface AudioToolbarProps {
  voices: VoiceOption[];
  selectedVoiceURI: string | null;
  onSelectVoice: (voiceURI: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  autoAdvance: boolean;
  onToggleAutoAdvance: () => void;
  speechRate: number;
  onChangeSpeechRate: (rate: number) => void;
  onTestVoice?: (voiceURI?: string) => void;
  onReloadVoices?: () => void;
}

export const AudioToolbar: React.FC<AudioToolbarProps> = ({
  voices,
  selectedVoiceURI,
  onSelectVoice,
  isMuted,
  onToggleMute,
  isSpeaking,
  isPaused,
  onPlay,
  onPause,
  onReset,
  autoAdvance,
  onToggleAutoAdvance,
  speechRate,
  onChangeSpeechRate,
  onTestVoice,
  onReloadVoices,
}) => {
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const handleVoiceChange = (newVoiceURI: string) => {
    unlockAudioEngine();
    onSelectVoice(newVoiceURI);
    if (onTestVoice) {
      setTimeout(() => {
        onTestVoice(newVoiceURI);
      }, 150);
    }
  };

  const handlePlayChime = () => {
    unlockAudioEngine();
    playSacredChime(432, 2.5);
  };

  const toggleVoiceSettings = () => {
    const nextState = !showVoiceSettings;
    setShowVoiceSettings(nextState);
    if (nextState) {
      unlockAudioEngine();
      if (onReloadVoices) onReloadVoices();
    }
  };

  return (
    <div className="w-full bg-white/80 dark:bg-[#20201a] border border-[#d1d1c1] dark:border-[#38382f] rounded-2xl p-3 sm:p-4 shadow-sm transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Play/Pause/Reset Controls */}
        <div className="flex items-center gap-2">
          {/* Mute/Unmute */}
          <button
            type="button"
            onClick={() => {
              unlockAudioEngine();
              onToggleMute();
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              isMuted
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                : 'bg-white dark:bg-[#2a2a22] border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-[#f5f5f0]'
            }`}
            title={isMuted ? 'Unmute Audio Narration' : 'Mute Audio Narration'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={() => {
              unlockAudioEngine();
              if (isSpeaking && !isPaused) {
                onPause();
              } else {
                onPlay();
              }
            }}
            disabled={isMuted}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/50 ${
              isMuted
                ? 'bg-[#d1d1c1] dark:bg-[#38382f] text-[#8c7b5b] cursor-not-allowed border border-[#d1d1c1] dark:border-[#38382f]'
                : isSpeaking && !isPaused
                ? 'bg-[#484833] hover:bg-[#383828] text-white border border-[#484833]'
                : 'bg-[#5a5a40] hover:bg-[#484833] text-white border border-[#5a5a40]'
            }`}
          >
            {isSpeaking && !isPaused ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Speech</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>{isPaused ? 'Resume Speech' : 'Recite Prayer'}</span>
              </>
            )}
          </button>

          {/* Reset / Stop Button */}
          <button
            type="button"
            onClick={() => {
              unlockAudioEngine();
              onReset();
            }}
            className="p-2.5 rounded-xl bg-white dark:bg-[#2a2a22] border border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-[#f5f5f0] transition-all"
            title="Reset Audio Speech"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Sacred Chime Button */}
          <button
            type="button"
            onClick={handlePlayChime}
            className="p-2.5 rounded-xl bg-white dark:bg-[#2a2a22] border border-[#d1d1c1] dark:border-[#38382f] text-[#8c7b5b] dark:text-[#d0c0a0] hover:bg-[#f5f5f0] transition-all flex items-center gap-1 text-xs"
            title="Play Prayer Bell Chime"
          >
            <Bell className="w-4 h-4 text-[#8c7b5b]" />
          </button>
        </div>

        {/* Right side controls: Auto Advance & Settings toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auto Advance Toggle */}
          <button
            type="button"
            onClick={onToggleAutoAdvance}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all ${
              autoAdvance
                ? 'bg-[#5a5a40]/10 dark:bg-[#5a5a40]/30 border-[#5a5a40] text-[#5a5a40] dark:text-[#c5c5a5]'
                : 'bg-white dark:bg-[#2a2a22] border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#a0a090]'
            }`}
            title="Auto-Advance to next step when prayer speech finishes"
          >
            <Sparkles className={`w-3.5 h-3.5 ${autoAdvance ? 'text-[#5a5a40] dark:text-[#c5c5a5] animate-pulse' : ''}`} />
            <span>Auto-Advance</span>
            <span
              className={`w-2 h-2 rounded-full ${
                autoAdvance ? 'bg-[#5a5a40]' : 'bg-[#d1d1c1] dark:bg-[#484838]'
              }`}
            />
          </button>

          {/* Voice Options Toggle */}
          <button
            type="button"
            onClick={toggleVoiceSettings}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-all ${
              showVoiceSettings
                ? 'bg-[#8c7b5b]/15 dark:bg-[#8c7b5b]/30 border-[#8c7b5b] text-[#8c7b5b] dark:text-[#d0c0a0]'
                : 'bg-white dark:bg-[#2a2a22] border-[#d1d1c1] dark:border-[#38382f] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-[#f5f5f0]'
            }`}
          >
            <span>Voice Options</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showVoiceSettings ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Voice & Speed Panel */}
      {showVoiceSettings && (
        <div className="mt-3 pt-3 border-t border-[#d1d1c1] dark:border-[#38382f] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Voice Dropdown + Test Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[#4a4a3f] dark:text-[#c5c5b5] font-medium">
                <Mic className="w-3.5 h-3.5 text-[#8c7b5b]" />
                <span>Voice Selector</span>
              </label>

              <div className="flex items-center gap-3">
                {onReloadVoices && (
                  <button
                    type="button"
                    onClick={() => {
                      unlockAudioEngine();
                      onReloadVoices();
                    }}
                    className="text-[11px] font-semibold text-[#8c7b5b] dark:text-[#a09070] hover:underline flex items-center gap-1"
                    title="Refresh System Voice Engine List"
                  >
                    <RotateCcw className="w-3 h-3 text-[#8c7b5b]" />
                    <span>Reload Voices</span>
                  </button>
                )}

                {onTestVoice && (
                  <button
                    type="button"
                    onClick={() => {
                      unlockAudioEngine();
                      onTestVoice(selectedVoiceURI || undefined);
                    }}
                    className="text-[11px] font-semibold text-[#5a5a40] dark:text-[#c5c5a5] hover:underline flex items-center gap-1"
                  >
                    <Volume1 className="w-3.5 h-3.5 text-[#8c7b5b]" />
                    <span>Test Voice</span>
                  </button>
                )}
              </div>
            </div>

            <select
              value={selectedVoiceURI || 'cloud-en-us'}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full bg-white dark:bg-[#282822] border border-[#d1d1c1] dark:border-[#38382f] text-[#2c2c24] dark:text-[#e8e8e0] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#5a5a40] focus:outline-none"
            >
              <optgroup label="✨ Universal Cloud Voices (All Devices)">
                {voices
                  .filter((v) => v.provider === 'cloud')
                  .map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} {v.default ? '• Default' : ''}
                    </option>
                  ))}
              </optgroup>

              <optgroup label="🔔 Tone & Bell Mode">
                {voices
                  .filter((v) => v.provider === 'synth')
                  .map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
              </optgroup>

              {voices.some((v) => v.provider === 'system') && (
                <optgroup label="📱 Device Local System Voices">
                  {voices
                    .filter((v) => v.provider === 'system')
                    .map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Speech Rate Slider (0.7x to 1.1x) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[#4a4a3f] dark:text-[#c5c5b5] font-medium">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#8c7b5b]" />
                <span>Speech Pace (Reverence Speed)</span>
              </span>
              <span className="font-bold text-[#8c7b5b]">{speechRate.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#8c7b5b]">0.7x (Solemn)</span>
              <input
                type="range"
                min="0.7"
                max="1.1"
                step="0.05"
                value={speechRate}
                onChange={(e) => onChangeSpeechRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#d1d1c1] dark:bg-[#38382f] rounded-lg appearance-none cursor-pointer accent-[#5a5a40]"
              />
              <span className="text-[10px] text-[#8c7b5b]">1.1x (Brisk)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
