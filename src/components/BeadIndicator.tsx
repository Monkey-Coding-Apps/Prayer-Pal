import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface BeadIndicatorProps {
  currentBeadIndex?: number; // 1 to 10
  currentDecadeNumber?: number; // 1 to totalDecades
  totalDecades?: number;
  onSelectBead?: (beadNumber: number) => void;
}

export const BeadIndicator: React.FC<BeadIndicatorProps> = ({
  currentBeadIndex,
  currentDecadeNumber,
  totalDecades,
  onSelectBead,
}) => {
  const beads = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="w-full bg-white/60 dark:bg-[#20201a]/80 backdrop-blur-sm border border-[#d1d1c1] dark:border-[#38382f] rounded-2xl p-4 shadow-sm my-4">
      {/* Top Header Label */}
      <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#4a4a3f] dark:text-[#a0a090]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#5a5a40]"></span>
          <span className="font-semibold tracking-wider uppercase text-[11px] text-[#5a5a40] dark:text-[#c5c5a5] font-cinzel">
            Decade {currentDecadeNumber || 1} of {totalDecades || 5}
          </span>
        </div>
        <div className="text-[11px] font-medium text-[#8c7b5b] dark:text-[#b0a080]">
          {currentBeadIndex ? `Hail Mary Bead ${currentBeadIndex} of 10` : 'Introductory / Closing'}
        </div>
      </div>

      {/* 10 Bead Visual Dots in 2 Rows (1-5 and 6-10) */}
      <div className="space-y-2 py-1 max-w-md mx-auto">
        {/* Row 1: Beads 1 to 5 */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {[1, 2, 3, 4, 5].map((beadNum) => {
            const isCurrent = currentBeadIndex === beadNum;
            const isCompleted = currentBeadIndex !== undefined && beadNum < currentBeadIndex;

            return (
              <div key={beadNum} className="flex flex-col items-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelectBead && onSelectBead(beadNum)}
                  className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/50 ${
                    isCurrent
                      ? 'bg-[#5a5a40] text-white shadow-lg shadow-[#5a5a40]/40 ring-4 ring-[#5a5a40]/20 font-bold animate-bead-pulse z-10'
                      : isCompleted
                      ? 'bg-[#8c7b5b] text-white dark:bg-[#8c7b5b]/90'
                      : 'bg-white dark:bg-[#282822] text-[#5a5a40] dark:text-[#a0a090] hover:border-[#5a5a40] border border-[#d1d1c1] dark:border-[#38382f]'
                  }`}
                  title={`Jump to Hail Mary Bead ${beadNum}`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span className={`text-xs font-semibold ${isCurrent ? 'text-white' : ''}`}>
                      {beadNum}
                    </span>
                  )}
                </motion.button>

                <div className="h-1.5 mt-1">
                  {isCurrent && (
                    <motion.div
                      layoutId="activeBeadIndicator"
                      className="w-1.5 h-1.5 rounded-full bg-[#5a5a40]"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Row 2: Beads 6 to 10 */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {[6, 7, 8, 9, 10].map((beadNum) => {
            const isCurrent = currentBeadIndex === beadNum;
            const isCompleted = currentBeadIndex !== undefined && beadNum < currentBeadIndex;

            return (
              <div key={beadNum} className="flex flex-col items-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelectBead && onSelectBead(beadNum)}
                  className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/50 ${
                    isCurrent
                      ? 'bg-[#5a5a40] text-white shadow-lg shadow-[#5a5a40]/40 ring-4 ring-[#5a5a40]/20 font-bold animate-bead-pulse z-10'
                      : isCompleted
                      ? 'bg-[#8c7b5b] text-white dark:bg-[#8c7b5b]/90'
                      : 'bg-white dark:bg-[#282822] text-[#5a5a40] dark:text-[#a0a090] hover:border-[#5a5a40] border border-[#d1d1c1] dark:border-[#38382f]'
                  }`}
                  title={`Jump to Hail Mary Bead ${beadNum}`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span className={`text-xs font-semibold ${isCurrent ? 'text-white' : ''}`}>
                      {beadNum}
                    </span>
                  )}
                </motion.button>

                <div className="h-1.5 mt-1">
                  {isCurrent && (
                    <motion.div
                      layoutId="activeBeadIndicator"
                      className="w-1.5 h-1.5 rounded-full bg-[#5a5a40]"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar under beads */}
      <div className="mt-2 w-full bg-[#d1d1c1]/50 dark:bg-[#2e2e26] rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-[#5a5a40] h-full transition-all duration-300 rounded-full"
          style={{
            width: `${
              currentBeadIndex
                ? (currentBeadIndex / 10) * 100
                : currentDecadeNumber
                ? (currentDecadeNumber / (totalDecades || 5)) * 100
                : 0
            }%`,
          }}
        />
      </div>
    </div>
  );
};
