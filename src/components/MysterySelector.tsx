import React from 'react';
import { MYSTERY_SETS, getRecommendedMysteryForToday } from '../data/prayers';
import { MysteryType } from '../types';
import { Sparkles, Sun, Compass } from 'lucide-react';

interface MysterySelectorProps {
  selectedType: MysteryType;
  onSelectType: (type: MysteryType) => void;
}

export const MysterySelector: React.FC<MysterySelectorProps> = ({
  selectedType,
  onSelectType,
}) => {
  const recommendedToday = getRecommendedMysteryForToday();

  const mysteries: MysteryType[] = ['joyful', 'luminous', 'sorrowful', 'glorious'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-[#5a5a40] dark:text-[#c5c5a5] font-cinzel flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[#8c7b5b]" />
          <span>Select Rosary Mystery Set</span>
        </label>
        <span className="text-[11px] text-[#5a5a40] dark:text-[#c5c5a5] bg-[#5a5a40]/10 dark:bg-[#5a5a40]/30 px-3 py-1 rounded-full font-medium border border-[#5a5a40]/20 flex items-center gap-1">
          <Sun className="w-3 h-3 text-[#8c7b5b]" />
          <span>Today: {MYSTERY_SETS[recommendedToday].title.replace('The ', '')}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {mysteries.map((type) => {
          const set = MYSTERY_SETS[type];
          const isSelected = selectedType === type;
          const isRecommended = recommendedToday === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelectType(type)}
              className={`relative text-left p-4 rounded-2xl border transition-all duration-200 focus:outline-none ${
                isSelected
                  ? 'bg-[#5a5a40]/15 dark:bg-[#5a5a40]/30 border-[#5a5a40] ring-2 ring-[#5a5a40]/30 text-[#2c2c24] dark:text-[#e8e8e0] shadow-sm'
                  : 'bg-white/80 dark:bg-[#20201a] border-[#d1d1c1] dark:border-[#38382f] hover:border-[#5a5a40] text-[#4a4a3f] dark:text-[#c5c5b5]'
              }`}
            >
              {isRecommended && (
                <span className="absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wider bg-[#5a5a40] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Today
                </span>
              )}

              <div className="font-cinzel font-bold text-sm text-[#2c2c24] dark:text-[#e8e8e0] pr-12">
                {set.title}
              </div>
              <div className="text-[11px] text-[#8c7b5b] dark:text-[#a09070] mt-0.5">
                {set.days}
              </div>
              <div className="text-xs text-[#5a5a40] dark:text-[#c5c5a5] mt-2 font-medium line-clamp-1">
                {set.decades.map((d) => d.title).join(' • ')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
