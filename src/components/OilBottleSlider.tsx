'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

interface OilBottleSliderProps {
  /** Total bottle volume in ml. Default 1500 (1.5L Afia bottle). */
  totalMl?: number;
  /** Step in ml. Default 100ml (= half cup). */
  stepMl?: number;
  /** Cup size in ml. Default 200ml. */
  cupMl?: number;
  /** Initial value in ml. Default = totalMl (full). */
  initialMl?: number;
  /** Called whenever the value changes (snapped). */
  onChange?: (ml: number) => void;
}

export function OilBottleSlider({
  totalMl = 1500,
  stepMl = 100,
  cupMl = 200,
  initialMl,
  onChange,
}: OilBottleSliderProps) {
  const { lang } = useLanguage();
  const [ml, setMl] = useState<number>(initialMl ?? totalMl);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalSteps = Math.round(totalMl / stepMl); // 15
  const ratio = ml / totalMl;
  const cups = ml / cupMl;
  const totalCups = totalMl / cupMl;
  const stepCups = stepMl / cupMl; // 0.5 (half cup)

  // Animated motion value for smooth fill animation
  const fillRatio = useMotionValue(ratio);
  const handleY = useTransform(fillRatio, (v) => `${(1 - v) * 100}%`);
  const fillHeight = useTransform(fillRatio, (v) => `${v * 100}%`);

  // Animate to new ratio when ml changes
  useEffect(() => {
    const controls = animate(fillRatio, ratio, {
      type: 'spring',
      stiffness: 260,
      damping: 24,
      mass: 0.6,
    });
    return controls.stop;
  }, [ratio, fillRatio]);

  // Convert pointer Y position to ml (snapped to nearest step)
  const pointerToMl = useCallback(
    (clientY: number): number => {
      const track = trackRef.current;
      if (!track) return ml;
      const rect = track.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const clampedY = Math.max(0, Math.min(rect.height, relativeY));
      // Top of track = 100%, bottom = 0%
      const newRatio = 1 - clampedY / rect.height;
      const rawMl = newRatio * totalMl;
      // Snap to nearest step
      const snapped = Math.round(rawMl / stepMl) * stepMl;
      return Math.max(0, Math.min(totalMl, snapped));
    },
    [ml, totalMl, stepMl],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const newMl = pointerToMl(e.clientY);
    setMl(newMl);
    onChange?.(newMl);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newMl = pointerToMl(e.clientY);
    if (newMl !== ml) {
      setMl(newMl);
      onChange?.(newMl);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  // Quick increment/decrement
  const adjust = (delta: number) => {
    const newMl = Math.max(0, Math.min(totalMl, ml + delta));
    setMl(newMl);
    onChange?.(newMl);
  };

  // Generate tick marks (16 ticks: 0, 100, 200, ..., 1500)
  const ticks = Array.from({ length: totalSteps + 1 }, (_, i) => {
    const value = i * stepMl;
    const isMajor = value % 500 === 0; // 0, 500, 1000, 1500
    const isHalf = value % cupMl === 0; // every full cup
    return { value, isMajor, isHalf };
  });

  // Status color based on level
  const levelColor =
    ratio > 0.66 ? '#16a34a' :  // green
    ratio > 0.33 ? '#eab308' :  // yellow
    ratio > 0.10 ? '#f97316' :  // orange
    '#dc2626';                   // red

  const levelLabel =
    ratio > 0.66 ? (lang === 'ar' ? 'ممتاز' : 'Plenty') :
    ratio > 0.33 ? (lang === 'ar' ? 'متوسط' : 'Medium') :
    ratio > 0.10 ? (lang === 'ar' ? 'منخفض' : 'Low') :
    (lang === 'ar' ? 'فاضي تقريبًا' : 'Almost empty');

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Header values */}
      <div className="text-center mb-6">
        <motion.div
          key={ml}
          initial={{ scale: 0.95, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="text-shimmer text-5xl font-bold mb-1 tabular-nums">
            {ml}
            <span className="text-2xl text-gold-500 ms-1">ml</span>
          </div>
          <div className="text-gold-600 text-sm">
            <span className="font-semibold tabular-nums">{cups.toFixed(1)}</span>
            <span className="mx-1">·</span>
            <span>{lang === 'ar' ? `من ${totalCups} كوب` : `of ${totalCups} cups`}</span>
          </div>
          <motion.div
            animate={{ color: levelColor }}
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full text-[11px] font-bold"
            style={{ backgroundColor: `${levelColor}15`, color: levelColor }}
          >
            <span>{Math.round(ratio * 100)}%</span>
            <span>·</span>
            <span>{levelLabel}</span>
          </motion.div>
        </motion.div>
      </div>

      <div className="flex items-stretch justify-center gap-6">
        {/* Tick scale (left) */}
        <div className="flex flex-col justify-between py-4 text-right select-none">
          {ticks.slice().reverse().map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setMl(t.value);
                onChange?.(t.value);
              }}
              className={`flex items-center gap-2 transition-all ${
                t.value === ml
                  ? 'text-gold-700 font-bold scale-110'
                  : t.isMajor
                  ? 'text-gold-600 hover:text-gold-700'
                  : t.isHalf
                  ? 'text-gold-500/70 hover:text-gold-600'
                  : 'text-gold-400/50 hover:text-gold-500'
              }`}
              type="button"
            >
              <span
                className={`tabular-nums ${
                  t.isMajor ? 'text-xs font-bold' : t.isHalf ? 'text-[10px]' : 'text-[9px]'
                }`}
              >
                {t.value}
              </span>
              <span className="text-[8px] text-gold-400">ml</span>
              <div
                className={`bg-gold-400 ${
                  t.isMajor ? 'h-0.5 w-3' : t.isHalf ? 'h-px w-2' : 'h-px w-1'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Bottle visualization (center) */}
        <div className="relative" style={{ width: 220, height: 460 }}>
          {/* Track for pointer events (full bottle area) */}
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
            style={{ touchAction: 'none' }}
          >
            <svg
              viewBox="0 0 100 200"
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Oil gradient */}
                <linearGradient id="oilGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#facc15" stopOpacity="1" />
                  <stop offset="100%" stopColor="#eab308" stopOpacity="1" />
                </linearGradient>
                {/* Glass highlight */}
                <linearGradient id="glassHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                  <stop offset="20%" stopColor="white" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                {/* Clip path: bottle interior */}
                <clipPath id="bottleClip">
                  <path d={getBottlePath()} />
                </clipPath>
              </defs>

              {/* Bottle background (empty glass) */}
              <path
                d={getBottlePath()}
                fill="rgba(254, 249, 195, 0.25)"
                stroke="#fde047"
                strokeWidth="0.6"
                fillRule="evenodd"
              />

              {/* Animated oil fill - clipped to bottle shape */}
              <g clipPath="url(#bottleClip)">
                <motion.rect
                  x="0"
                  width="100"
                  fill="url(#oilGradient)"
                  style={{
                    height: fillHeight,
                    y: useTransform(fillRatio, (v) => 200 - v * 200),
                  }}
                />
                {/* Surface ripple effect */}
                <motion.line
                  x1="0"
                  x2="100"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeOpacity="0.6"
                  y1={useTransform(fillRatio, (v) => 200 - v * 200)}
                  y2={useTransform(fillRatio, (v) => 200 - v * 200)}
                />
              </g>

              {/* Glass highlight overlay */}
              <path
                d={getBottlePath()}
                fill="url(#glassHighlight)"
                fillRule="evenodd"
                pointerEvents="none"
              />

              {/* Bottle outline */}
              <path
                d={getBottlePath()}
                fill="none"
                stroke="#d97706"
                strokeWidth="1"
                strokeLinejoin="round"
                fillRule="evenodd"
              />
            </svg>

            {/* Drag handle indicator */}
            <motion.div
              className="absolute left-0 right-0 pointer-events-none"
              style={{ top: handleY, marginTop: '-12px' }}
            >
              <div className="relative h-6 flex items-center justify-center">
                <div
                  className="absolute inset-x-2 h-1 rounded-full shadow-lg"
                  style={{ backgroundColor: levelColor }}
                />
                <motion.div
                  animate={{
                    scale: isDragging ? 1.15 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="absolute right-0 w-7 h-7 rounded-full shadow-2xl border-2 border-white flex items-center justify-center"
                  style={{ backgroundColor: levelColor }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M7 10l5 5 5-5z" />
                    <path d="M7 14l5-5 5 5z" />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Cup display + controls (right) */}
        <div className="flex flex-col justify-between py-4 select-none">
          {/* Cup icons - one per cup */}
          <div className="flex flex-col gap-1.5 items-center">
            {Array.from({ length: Math.ceil(totalCups) }).map((_, i) => {
              const cupIndex = Math.ceil(totalCups) - 1 - i; // top down
              const cupFill = Math.max(0, Math.min(1, cups - cupIndex));
              return (
                <div key={i} className="relative w-7 h-9">
                  {/* Cup outline */}
                  <svg viewBox="0 0 24 30" className="absolute inset-0">
                    <path
                      d="M 4 6 L 4 22 Q 4 27 9 27 L 15 27 Q 20 27 20 22 L 20 6 Z"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    {/* Cup fill (animated) */}
                    <motion.rect
                      x="4"
                      width="16"
                      fill="#facc15"
                      animate={{
                        y: 6 + (1 - cupFill) * 21,
                        height: cupFill * 21,
                      }}
                      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                      clipPath="path('M 4 6 L 4 22 Q 4 27 9 27 L 15 27 Q 20 27 20 22 L 20 6 Z')"
                    />
                  </svg>
                  <span className="absolute -right-4 top-1/2 -translate-y-1/2 text-[9px] text-gold-500 font-bold tabular-nums">
                    {cupIndex + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick step buttons */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          onClick={() => adjust(-stepMl)}
          disabled={ml <= 0}
          className="bg-gold-100 hover:bg-gold-200 disabled:opacity-40 disabled:cursor-not-allowed text-gold-800 w-10 h-10 rounded-full font-bold text-lg flex items-center justify-center shadow-md transition-all active:scale-95"
          aria-label={lang === 'ar' ? 'إنقاص' : 'Decrease'}
        >
          −
        </button>
        <div className="bg-gold-50 border border-gold-200 rounded-xl px-4 py-2 min-w-[100px] text-center">
          <div className="text-gold-700 text-xs">{lang === 'ar' ? 'الخطوة' : 'Step'}</div>
          <div className="text-gold-800 text-sm font-bold tabular-nums">
            {stepMl}ml ({stepCups} {lang === 'ar' ? 'كوب' : 'cup'})
          </div>
        </div>
        <button
          onClick={() => adjust(stepMl)}
          disabled={ml >= totalMl}
          className="bg-gold-100 hover:bg-gold-200 disabled:opacity-40 disabled:cursor-not-allowed text-gold-800 w-10 h-10 rounded-full font-bold text-lg flex items-center justify-center shadow-md transition-all active:scale-95"
          aria-label={lang === 'ar' ? 'زيادة' : 'Increase'}
        >
          +
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        {[0, 250, 500, 750, 1000, 1250, 1500].map((preset) => (
          <button
            key={preset}
            onClick={() => {
              setMl(preset);
              onChange?.(preset);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              ml === preset
                ? 'bg-gold-gradient text-white shadow-md'
                : 'bg-white/60 text-gold-700 hover:bg-gold-100 border border-gold-200'
            }`}
          >
            {preset}ml
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="text-center text-gold-500 text-[11px] mt-4">
        {lang === 'ar'
          ? '💡 اسحب المؤشر لأعلى أو أسفل، أو اضغط على أي قيمة في المسطرة'
          : '💡 Drag the pointer up/down, or tap any value on the scale'}
      </p>
    </div>
  );
}

// ============================================================
// SVG bottle path (simplified for slider, viewBox 100x200)
// ============================================================
function getBottlePath(): string {
  return `
    M 41 18
    L 59 18
    L 59 26
    Q 60 30 64 33
    Q 70 36 72 44
    Q 78 42 84 48
    Q 86 52 86 58
    L 86 88
    Q 86 94 84 98
    Q 78 104 72 100
    L 72 168
    Q 72 180 60 184
    L 30 184
    Q 18 180 18 168
    L 18 58
    Q 18 50 22 44
    Q 28 38 32 36
    Q 38 33 40 26
    Z
    M 73 50
    Q 73 48 75 48
    L 80 48
    Q 82 48 82 50
    L 82 92
    Q 82 94 80 94
    L 75 94
    Q 73 94 73 92
    Z
  `;
}
