import React, { useState, useEffect } from 'react';
import { AppMode, RosaryConfig } from './types';
import { getRecommendedMysteryForToday } from './data/prayers';
import { Header } from './components/Header';
import { GuidedRosaryMode } from './components/GuidedRosaryMode';
import { IndividualPrayersMode } from './components/IndividualPrayersMode';
import { unlockAudioEngine } from './utils/audioChime';

export default function App() {
  const [mode, setMode] = useState<AppMode>('guided');

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rosary_dark_mode');
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('rosary_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Unlock mobile Web Audio / Speech API on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudioEngine();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Rosary Configuration State
  const [config, setConfig] = useState<RosaryConfig>(() => ({
    decadeCount: 5,
    mysteryType: getRecommendedMysteryForToday(),
    autoAdvance: true,
    speechRate: 0.85,
    voiceURI: null,
    isAudioMuted: false,
    fontSize: 'base',
  }));

  const handleUpdateConfig = (updater: (prev: RosaryConfig) => RosaryConfig) => {
    setConfig((prev) => updater(prev));
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#181814] text-[#2c2c24] dark:text-[#e8e8e0] flex flex-col font-sans transition-colors duration-200 selection:bg-[#5a5a40] selection:text-white">
      {/* Persistent Navigation Header */}
      <Header
        mode={mode}
        onSelectMode={setMode}
        config={config}
        onUpdateConfig={handleUpdateConfig}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {mode === 'guided' ? (
          <GuidedRosaryMode
            config={config}
            onUpdateConfig={handleUpdateConfig}
          />
        ) : (
          <IndividualPrayersMode
            config={config}
            onUpdateConfig={handleUpdateConfig}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d1d1c1] dark:border-[#33332b] bg-[#ecece6]/50 dark:bg-[#141410] py-6 text-center text-xs text-[#5a5a40] dark:text-[#a0a090] font-sans">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-cinzel font-semibold text-[#5a5a40] dark:text-[#c5c5b5]">
            PRAYER PAL • Catholic Holy Rosary & Prayer Companion
          </p>
          <p className="text-[11px] text-[#8c7b5b] dark:text-[#a09070]">
            "Pray without ceasing." — 1 Thessalonians 5:17
          </p>
        </div>
      </footer>
    </div>
  );
}
