'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface CupTargetInputProps {
  cupMl?: number;          // default 200 (ml per cup)
  maxCups?: number;        // default 7.5 (max for 1.5L bottle)
  onTargetChange: (targetMl: number) => void;
  currentMl?: number;      // optional - to highlight active preset
}

export function CupTargetInput({
  cupMl = 200,
  maxCups = 7.5,
  onTargetChange,
  currentMl,
}: CupTargetInputProps) {
  const { lang } = useLanguage();
  const isRTL = lang === 'ar';

  const [customCups, setCustomCups] = useState<string>('');

  const presets = [
    { cups: 0.5, ml: 100 },
    { cups: 1, ml: 200 },
    { cups: 1.5, ml: 300 },
    { cups: 2, ml: 400 },
    { cups: 3, ml: 600 },
    { cups: 4, ml: 800 },
  ];

  const handlePresetClick = (cups: number) => {
    const targetMl = cups * cupMl;
    setCustomCups(String(cups));
    onTargetChange(targetMl);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCups(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onTargetChange(numValue * cupMl);
    }
  };

  const selectedCups = customCups
    ? parseFloat(customCups)
    : currentMl !== undefined
    ? currentMl / cupMl
    : 0;
  const selectedMl = !isNaN(selectedCups) ? selectedCups * cupMl : 0;

  return (
    <div
      className="glass-card-green rounded-2xl p-5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-gold-700 font-bold text-sm">
          {isRTL ? 'اختر الكمية المطلوبة' : 'Select target amount'}
        </h3>
        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent" />
      </div>

      {/* Quick presets row */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {presets.map((preset) => {
          const isActive =
            currentMl !== undefined && Math.abs(currentMl - preset.ml) < 0.5;
          return (
            <motion.button
              key={preset.cups}
              type="button"
              whileTap={{ scale: 0.95 }}
              animate={isActive ? { scale: 1.05 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => handlePresetClick(preset.cups)}
              className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 transition-all duration-200 ${
                isActive
                  ? 'bg-gold-gradient text-white shadow-md'
                  : 'bg-white/60 border border-gold-200 text-gold-700 hover:bg-white/80'
              }`}
            >
              <span className="text-xs font-bold leading-tight">
                {preset.cups}
              </span>
              <span className="text-[10px] opacity-90 leading-tight">
                {preset.ml}ml
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Custom input row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <label className="text-gold-700 text-xs font-medium flex-1">
          {isRTL ? 'أو أدخل عدد الأكواب' : 'Or enter custom cups'}
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          max={maxCups}
          value={customCups}
          onChange={handleCustomChange}
          className="bg-white/50 border border-gold-200 rounded-lg px-3 py-2 w-24 text-center text-gold-800 focus:outline-none focus:ring-2 focus:ring-gold-400 transition-all duration-200"
          placeholder="0"
        />
      </div>

      {/* Current selection display */}
      <motion.div
        key={selectedMl}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center pt-3 border-t border-gold-200/50"
      >
        <span className="text-gold-700 text-xs">
          {isRTL ? 'المحدد: ' : 'Selected: '}
        </span>
        <span className="text-green-700 font-bold text-sm">
          {selectedCups || 0} {isRTL ? 'كوب' : 'cups'} = {selectedMl || 0} ml
        </span>
      </motion.div>
    </div>
  );
}
