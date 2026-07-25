import React, { useState } from 'react';
import { AppMode, RosaryConfig } from '../types';
import {
  Sparkles,
  BookOpen,
  Sun,
  Moon,
  Type,
  HelpCircle,
  X,
  Cross,
  Heart,
} from 'lucide-react';

interface HeaderProps {
  mode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  config: RosaryConfig;
  onUpdateConfig: (updater: (prev: RosaryConfig) => RosaryConfig) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onSelectMode,
  config,
  onUpdateConfig,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fontSizes: Array<'sm' | 'base' | 'lg' | 'xl'> = ['sm', 'base', 'lg', 'xl'];

  const cycleFontSize = () => {
    const currentIdx = fontSizes.indexOf(config.fontSize);
    const nextIdx = (currentIdx + 1) % fontSizes.length;
    onUpdateConfig((prev) => ({ ...prev, fontSize: fontSizes[nextIdx] }));
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/70 dark:bg-[#1a1a16]/80 backdrop-blur-md border-b border-[#d1d1c1] dark:border-[#38382f] transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#5a5a40] flex items-center justify-center text-white shadow-md shadow-[#5a5a40]/20">
              <Cross className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-cinzel font-bold text-base sm:text-lg text-[#2c2c24] dark:text-[#e8e8e0] tracking-wide flex items-center gap-2">
                PRAYER PAL
              </h1>
              <p className="text-[10px] text-[#8c7b5b] dark:text-[#a09070] font-medium font-sans uppercase tracking-widest">
                Catholic Prayer & Audio Companion
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center bg-white/60 dark:bg-[#24241e] p-1 rounded-full border border-[#d1d1c1] dark:border-[#38382f]">
            <button
              type="button"
              onClick={() => onSelectMode('guided')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                mode === 'guided'
                  ? 'bg-[#5a5a40] text-white shadow-sm font-bold'
                  : 'text-[#4a4a3f] dark:text-[#a0a090] hover:text-[#2c2c24] dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Guided Rosary</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('individual')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                mode === 'individual'
                  ? 'bg-[#5a5a40] text-white shadow-sm font-bold'
                  : 'text-[#4a4a3f] dark:text-[#a0a090] hover:text-[#2c2c24] dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Individual Prayers</span>
            </button>
          </div>

          {/* Utility Tools: Font Size, Help, Dark Mode */}
          <div className="flex items-center gap-1.5">
            {/* Font Size Toggle */}
            <button
              type="button"
              onClick={cycleFontSize}
              className="p-2 rounded-xl bg-white/80 dark:bg-[#24241e] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-white dark:hover:bg-[#2d2d26] border border-[#d1d1c1] dark:border-[#38382f] transition-all text-xs font-bold flex items-center gap-1"
              title={`Current text size: ${config.fontSize.toUpperCase()}`}
            >
              <Type className="w-4 h-4 text-[#5a5a40] dark:text-[#a0a080]" />
              <span className="text-[10px] uppercase">{config.fontSize}</span>
            </button>

            {/* Help / Guide button */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-xl bg-white/80 dark:bg-[#24241e] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-white dark:hover:bg-[#2d2d26] border border-[#d1d1c1] dark:border-[#38382f] transition-all"
              title="How to Pray the Rosary"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl bg-white/80 dark:bg-[#24241e] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-white dark:hover:bg-[#2d2d26] border border-[#d1d1c1] dark:border-[#38382f] transition-all"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#8c7b5b]" /> : <Moon className="w-4 h-4 text-[#5a5a40]" />}
            </button>

            {/* Donate Link */}
            <a
              href="https://thetraditionalcatholic.com/donate.php"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/80 dark:bg-[#24241e] text-[#4a4a3f] dark:text-[#c5c5b5] hover:bg-white dark:hover:bg-[#2d2d26] border border-[#d1d1c1] dark:border-[#38382f] transition-all flex items-center gap-1.5 text-xs font-semibold hover:text-rose-600 dark:hover:text-rose-400"
              title="Donate to The Traditional Catholic"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              <span className="hidden sm:inline">Donate</span>
            </a>
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#f5f5f0] dark:bg-[#20201a] border border-[#d1d1c1] dark:border-[#38382f] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#8c7b5b] hover:text-[#5a5a40] bg-white/80 dark:bg-[#2a2a22]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3 text-[#5a5a40] dark:text-[#c5c5a5] font-cinzel font-bold text-lg">
              <Cross className="w-5 h-5" />
              <span>How to Pray the Rosary</span>
            </div>

            <div className="space-y-3 text-xs text-[#4a4a3f] dark:text-[#c5c5b5] leading-relaxed">
              <p>
                The Rosary is a scripture-based Catholic prayer consisting of decades of Hail Marys preceded by the Our Father and followed by the Glory Be and Fatima Prayer.
              </p>
              
              <div className="p-3 bg-white/80 dark:bg-[#2a2a22] rounded-2xl border border-[#d1d1c1] dark:border-[#38382f]">
                <h4 className="font-bold text-[#5a5a40] dark:text-[#c5c5a5] text-xs mb-1">
                  Full 5-Decade Rosary:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-[#4a4a3f] dark:text-[#b5b5a5] text-[11px]">
                  <li>Sign of the Cross & Apostles' Creed</li>
                  <li>Our Father & 3 Hail Marys (Faith, Hope, Charity)</li>
                  <li>5 Decades: Our Father → 10 Hail Marys → Glory Be → O My Jesus</li>
                  <li>Closing: Hail Holy Queen & Concluding Prayer</li>
                </ol>
              </div>

              <div className="p-3 bg-white/80 dark:bg-[#2a2a22] rounded-2xl border border-[#d1d1c1] dark:border-[#38382f]">
                <h4 className="font-bold text-[#5a5a40] dark:text-[#c5c5a5] text-xs mb-1">
                  Quick Rosary (1, 2, 3, or 4 Decades):
                </h4>
                <p className="text-[11px]">
                  Skips opening Creed and introductory Hail Marys, starting directly with the Sign of the Cross and proceeding straight into your selected number of decades.
                </p>
              </div>

              <div className="p-3 bg-white/80 dark:bg-[#2a2a22] rounded-2xl border border-[#d1d1c1] dark:border-[#38382f]">
                <h4 className="font-bold text-[#5a5a40] dark:text-[#c5c5a5] text-xs mb-1">
                  Text-to-Speech & Auto-Advance:
                </h4>
                <p className="text-[11px]">
                  Select any natural voice on your device. Turn on <strong>Auto-Advance</strong> to let the app automatically speak each prayer and move to the next bead seamlessly.
                </p>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 bg-[#5a5a40] hover:bg-[#484833] text-white font-semibold text-xs rounded-full shadow-sm transition-colors"
              >
                Got It, Let's Pray
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
