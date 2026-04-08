'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import type { BottleBBox } from '@/services/api';

interface InteractiveBottleSliderProps {
  imageUrl: string;            // user's actual photo
  bottleBbox: BottleBBox;      // detected bottle bbox in image coordinates
  initialMl: number;           // detected oil amount in ml
  totalMl?: number;            // 1500 (1.5L)
  cupMl?: number;              // 200 (ml per cup)
  stepMl?: number;             // 100 (snap step)
  onChange?: (ml: number) => void;
  onConfirm?: (ml: number) => void;
}

// Where the oil column actually is, as a fraction of the bottle bbox.
// 0 = top of bbox (neck), 1 = bottom of bbox (base).
// The bottle has a small unfilled space at the very top (neck) and
// a small base curve at the bottom that doesn't hold oil.
const OIL_COLUMN_TOP_OFFSET = 0.04;    // 4% from bbox top (just below neck)
const OIL_COLUMN_BOTTOM_OFFSET = 0.02; // 2% from bbox bottom (above base)

export function InteractiveBottleSlider({
  imageUrl,
  bottleBbox,
  initialMl,
  totalMl = 1500,
  cupMl = 200,
  stepMl = 100,
  onChange,
  onConfirm,
}: InteractiveBottleSliderProps) {
  const { lang } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);
  const [ml, setMl] = useState(() => snapToStep(initialMl, stepMl, totalMl));
  const [isDragging, setIsDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const totalSteps = Math.round(totalMl / stepMl); // 15
  const totalCups = totalMl / cupMl;               // 7.5
  const cups = ml / cupMl;
  const ratio = ml / totalMl;

  // Compute bbox position in rendered (CSS) pixels
  const computeBbox = useCallback(() => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width === 0) return null;

    const scaleX = rect.width / bottleBbox.image_w;
    const scaleY = rect.height / bottleBbox.image_h;

    return {
      x: bottleBbox.x * scaleX,
      y: bottleBbox.y * scaleY,
      w: bottleBbox.w * scaleX,
      h: bottleBbox.h * scaleY,
      // Oil column inside bbox
      oilTopY: bottleBbox.y * scaleY + bottleBbox.h * scaleY * OIL_COLUMN_TOP_OFFSET,
      oilBottomY: bottleBbox.y * scaleY + bottleBbox.h * scaleY * (1 - OIL_COLUMN_BOTTOM_OFFSET),
    };
  }, [bottleBbox]);

  // Recompute on resize / image load
  useEffect(() => {
    const updateRect = () => {
      const img = imgRef.current;
      if (img) {
        setImgRect(img.getBoundingClientRect());
      }
    };
    updateRect();

    const observer = new ResizeObserver(updateRect);
    if (imgRef.current) observer.observe(imgRef.current);
    window.addEventListener('resize', updateRect);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
    };
  }, []);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (img) setImgRect(img.getBoundingClientRect());
  };

  const bbox = computeBbox();
  // Recompute when imgRect changes
  void imgRect;

  // Convert pointer Y to ml (snapped)
  const pointerToMl = useCallback(
    (clientY: number): number => {
      const img = imgRef.current;
      if (!img) return ml;
      const rect = img.getBoundingClientRect();
      const scaleY = rect.height / bottleBbox.image_h;
      const oilTop = bottleBbox.y * scaleY + bottleBbox.h * scaleY * OIL_COLUMN_TOP_OFFSET;
      const oilBottom = bottleBbox.y * scaleY + bottleBbox.h * scaleY * (1 - OIL_COLUMN_BOTTOM_OFFSET);
      const oilHeight = oilBottom - oilTop;

      const relativeY = clientY - rect.top - oilTop;
      const clampedY = Math.max(0, Math.min(oilHeight, relativeY));
      const newRatio = 1 - clampedY / oilHeight;
      const rawMl = newRatio * totalMl;
      return snapToStep(rawMl, stepMl, totalMl);
    },
    [bottleBbox, totalMl, stepMl, ml],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setConfirmed(false);
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

  const adjust = (delta: number) => {
    const newMl = Math.max(0, Math.min(totalMl, ml + delta));
    setMl(newMl);
    setConfirmed(false);
    onChange?.(newMl);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm?.(ml);
  };

  // Generate ticks (16 positions: 0, 100, 200, ..., 1500)
  const ticks = Array.from({ length: totalSteps + 1 }, (_, i) => {
    const value = i * stepMl;
    const cupVal = value / cupMl;
    return {
      value,
      cupVal,
      isMajor: value % 500 === 0,        // 0, 500, 1000, 1500
      isWholeCup: value % cupMl === 0,   // every full cup
    };
  });

  // Color based on level
  const levelColor =
    ratio > 0.66 ? '#22c55e' :
    ratio > 0.33 ? '#eab308' :
    ratio > 0.10 ? '#f97316' :
    '#ef4444';

  const correctionDelta = ml - initialMl;
  const hasCorrection = Math.abs(correctionDelta) > 0;

  return (
    <div className="w-full">
      {/* Image with overlay */}
      <div ref={containerRef} className="relative w-full select-none rounded-2xl overflow-hidden bg-black">
        {/* Bottle photo */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Bottle scan"
          className="w-full h-auto block"
          onLoad={handleImgLoad}
          draggable={false}
        />

        {/* Interactive overlay (slider track + ticks + handle) */}
        {bbox && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
            style={{ touchAction: 'none' }}
          >
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ left: 0, top: 0 }}
            >
              {/* Bottle bbox outline (subtle) */}
              <rect
                x={bbox.x}
                y={bbox.y}
                width={bbox.w}
                height={bbox.h}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                rx="4"
              />

              {/* "NECK" label at top */}
              <text
                x={bbox.x + bbox.w / 2}
                y={bbox.y - 6}
                fill="rgba(255,255,255,0.9)"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {lang === 'ar' ? 'الرقبة' : 'NECK'}
              </text>

              {/* "BASE" label at bottom */}
              <text
                x={bbox.x + bbox.w / 2}
                y={bbox.y + bbox.h + 14}
                fill="rgba(255,255,255,0.9)"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {lang === 'ar' ? 'القاع' : 'BASE'}
              </text>

              {/* Tick marks - on the right side of the bbox */}
              {ticks.map((tick) => {
                const oilTop = bbox.oilTopY;
                const oilBottom = bbox.oilBottomY;
                const oilHeight = oilBottom - oilTop;
                const tickRatio = tick.value / totalMl;
                const tickY = oilBottom - tickRatio * oilHeight;
                const isCurrent = tick.value === ml;
                const tickWidth = tick.isMajor ? 12 : tick.isWholeCup ? 8 : 4;

                return (
                  <g key={tick.value}>
                    <line
                      x1={bbox.x + bbox.w + 2}
                      y1={tickY}
                      x2={bbox.x + bbox.w + 2 + tickWidth}
                      y2={tickY}
                      stroke={isCurrent ? levelColor : 'white'}
                      strokeWidth={tick.isMajor ? 2 : tick.isWholeCup ? 1.5 : 1}
                      strokeOpacity={isCurrent ? 1 : tick.isMajor ? 0.95 : tick.isWholeCup ? 0.75 : 0.45}
                    />
                    {tick.isMajor && (
                      <text
                        x={bbox.x + bbox.w + 16}
                        y={tickY + 3}
                        fill="white"
                        fontSize="9"
                        fontWeight="bold"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {tick.value}ml
                      </text>
                    )}
                    {tick.isWholeCup && !tick.isMajor && (
                      <text
                        x={bbox.x + bbox.w + 12}
                        y={tickY + 3}
                        fill="rgba(255,255,255,0.7)"
                        fontSize="8"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {tick.cupVal}c
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Filled oil overlay (semi-transparent green inside bbox below the level line) */}
              {(() => {
                const oilTop = bbox.oilTopY;
                const oilBottom = bbox.oilBottomY;
                const oilHeight = oilBottom - oilTop;
                const fillTopY = oilBottom - ratio * oilHeight;
                return (
                  <rect
                    x={bbox.x + 2}
                    y={fillTopY}
                    width={bbox.w - 4}
                    height={Math.max(0, bbox.y + bbox.h - fillTopY - 2)}
                    fill={levelColor}
                    fillOpacity="0.18"
                    rx="2"
                  />
                );
              })()}

              {/* Original auto-detected reference line (cyan, dashed) */}
              {(() => {
                const oilTop = bbox.oilTopY;
                const oilBottom = bbox.oilBottomY;
                const oilHeight = oilBottom - oilTop;
                const initialRatio = initialMl / totalMl;
                const initialY = oilBottom - initialRatio * oilHeight;
                return (
                  <g>
                    <line
                      x1={bbox.x - 4}
                      y1={initialY}
                      x2={bbox.x + bbox.w + 4}
                      y2={initialY}
                      stroke="#06b6d4"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      strokeOpacity="0.95"
                    />
                    {/* "AUTO" badge on the right side */}
                    <rect
                      x={bbox.x + bbox.w + 6}
                      y={initialY - 7}
                      width={28}
                      height={14}
                      rx={3}
                      fill="#06b6d4"
                    />
                    <text
                      x={bbox.x + bbox.w + 20}
                      y={initialY + 3}
                      fill="white"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      AUTO
                    </text>
                  </g>
                );
              })()}

              {/* Difference bracket (only when adjusted) */}
              {(() => {
                const oilTop = bbox.oilTopY;
                const oilBottom = bbox.oilBottomY;
                const oilHeight = oilBottom - oilTop;
                const initialRatio = initialMl / totalMl;
                const initialY = oilBottom - initialRatio * oilHeight;
                const currentY = oilBottom - ratio * oilHeight;
                const delta = ml - initialMl;
                if (delta === 0) return null;

                const isPositive = delta > 0; // user added oil
                const bracketColor = isPositive ? '#22c55e' : '#ef4444';
                const bracketX = bbox.x - 30;
                const sign = isPositive ? '+' : '−';
                const absDeltaMl = Math.abs(delta);
                const absDeltaCups = absDeltaMl / cupMl;
                const labelY = (initialY + currentY) / 2 + 3;

                return (
                  <g>
                    {/* Vertical bracket line */}
                    <line
                      x1={bracketX}
                      y1={Math.min(initialY, currentY)}
                      x2={bracketX}
                      y2={Math.max(initialY, currentY)}
                      stroke={bracketColor}
                      strokeWidth="2.5"
                    />
                    {/* Top tick */}
                    <line
                      x1={bracketX}
                      y1={Math.min(initialY, currentY)}
                      x2={bracketX + 6}
                      y2={Math.min(initialY, currentY)}
                      stroke={bracketColor}
                      strokeWidth="2.5"
                    />
                    {/* Bottom tick */}
                    <line
                      x1={bracketX}
                      y1={Math.max(initialY, currentY)}
                      x2={bracketX + 6}
                      y2={Math.max(initialY, currentY)}
                      stroke={bracketColor}
                      strokeWidth="2.5"
                    />
                    {/* Difference label background */}
                    <rect
                      x={bracketX - 56}
                      y={labelY - 16}
                      width={52}
                      height={28}
                      rx={6}
                      fill={bracketColor}
                    />
                    <text
                      x={bracketX - 30}
                      y={labelY - 4}
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {sign}{absDeltaMl}ml
                    </text>
                    <text
                      x={bracketX - 30}
                      y={labelY + 8}
                      fill="white"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {sign}{absDeltaCups % 1 === 0 ? absDeltaCups.toFixed(0) : absDeltaCups.toFixed(1)} {lang === 'ar' ? 'كوب' : 'cup'}
                    </text>
                  </g>
                );
              })()}

              {/* Current oil level line */}
              {(() => {
                const oilTop = bbox.oilTopY;
                const oilBottom = bbox.oilBottomY;
                const oilHeight = oilBottom - oilTop;
                const handleY = oilBottom - ratio * oilHeight;
                return (
                  <>
                    {/* Horizontal line across bbox width */}
                    <line
                      x1={bbox.x - 4}
                      y1={handleY}
                      x2={bbox.x + bbox.w + 4}
                      y2={handleY}
                      stroke={levelColor}
                      strokeWidth="3"
                    />
                    {/* White outline for contrast */}
                    <line
                      x1={bbox.x - 4}
                      y1={handleY}
                      x2={bbox.x + bbox.w + 4}
                      y2={handleY}
                      stroke="white"
                      strokeWidth="0.5"
                      strokeDasharray="2 2"
                    />
                    {/* Drag handle on the LEFT side of the bbox */}
                    <circle
                      cx={bbox.x - 8}
                      cy={handleY}
                      r={isDragging ? 11 : 9}
                      fill={levelColor}
                      stroke="white"
                      strokeWidth="2"
                    />
                    {/* Up/down arrows on the handle */}
                    <text
                      x={bbox.x - 8}
                      y={handleY + 3}
                      fill="white"
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      ⇕
                    </text>
                  </>
                );
              })()}
            </svg>
          </div>
        )}
      </div>

      {/* Below the image: ml/cups display + controls */}
      <div className="mt-4 glass-card rounded-2xl p-4">
        {/* Big value display */}
        <motion.div
          key={ml}
          initial={{ scale: 0.95, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="text-center mb-4"
        >
          <div className="flex items-baseline justify-center gap-3">
            <div>
              <span className="text-shimmer text-4xl font-bold tabular-nums">{ml}</span>
              <span className="text-gold-500 text-lg ms-1">ml</span>
            </div>
            <span className="text-gold-300 text-2xl">·</span>
            <div>
              <span className="text-shimmer text-4xl font-bold tabular-nums">{cups.toFixed(1)}</span>
              <span className="text-gold-500 text-lg ms-1">{lang === 'ar' ? 'كوب' : 'cups'}</span>
            </div>
          </div>
          <div className="text-gold-500 text-xs mt-1">
            {lang === 'ar'
              ? `من ${totalMl} مل (${totalCups} كوب)`
              : `of ${totalMl}ml (${totalCups} cups)`}
          </div>
        </motion.div>

        {/* Step controls */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={() => adjust(-stepMl)}
            disabled={ml <= 0}
            className="bg-gold-100 hover:bg-gold-200 disabled:opacity-40 disabled:cursor-not-allowed text-gold-800 w-11 h-11 rounded-full font-bold text-xl flex items-center justify-center shadow-md transition-all active:scale-95"
          >
            −
          </button>
          <div className="bg-gold-50 border border-gold-200 rounded-xl px-3 py-1.5 text-center min-w-[90px]">
            <div className="text-gold-600 text-[10px]">
              {lang === 'ar' ? 'الخطوة' : 'Step'}
            </div>
            <div className="text-gold-800 text-xs font-bold tabular-nums">
              {stepMl}ml ({(stepMl / cupMl).toFixed(1)} {lang === 'ar' ? 'كوب' : 'cup'})
            </div>
          </div>
          <button
            onClick={() => adjust(stepMl)}
            disabled={ml >= totalMl}
            className="bg-gold-100 hover:bg-gold-200 disabled:opacity-40 disabled:cursor-not-allowed text-gold-800 w-11 h-11 rounded-full font-bold text-xl flex items-center justify-center shadow-md transition-all active:scale-95"
          >
            +
          </button>
        </div>

        {/* Difference panel - prominent comparison between auto and manual */}
        {hasCorrection && (() => {
          const isPositive = correctionDelta > 0;
          const sign = isPositive ? '+' : '−';
          const absMl = Math.abs(correctionDelta);
          const absCups = absMl / cupMl;
          const absCupsLabel =
            absCups % 1 === 0 ? absCups.toFixed(0) : absCups.toFixed(1);
          const initialCups = initialMl / cupMl;
          const bgClass = isPositive
            ? 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300';
          const textClass = isPositive ? 'text-green-700' : 'text-red-700';
          const accentClass = isPositive ? 'bg-green-500' : 'bg-red-500';
          const arrow = isPositive ? '↑' : '↓';
          const verb = lang === 'ar'
            ? (isPositive ? 'زيادة' : 'نقصان')
            : (isPositive ? 'Added' : 'Removed');

          return (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className={`border-2 rounded-xl p-3 mb-3 ${bgClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textClass}`}>
                  {lang === 'ar' ? 'فرق التعديل' : 'Adjustment'}
                </span>
                <span className={`${accentClass} text-white text-[9px] font-bold px-2 py-0.5 rounded-full`}>
                  {verb}
                </span>
              </div>
              <div className="flex items-baseline justify-center gap-2">
                <span className={`text-3xl font-bold ${textClass} tabular-nums`}>
                  {arrow}
                </span>
                <div>
                  <div className={`text-2xl font-bold ${textClass} tabular-nums`}>
                    {sign}{absMl}<span className="text-sm ms-0.5">ml</span>
                  </div>
                  <div className={`text-sm font-bold ${textClass} tabular-nums`}>
                    {sign}{absCupsLabel} {lang === 'ar' ? 'كوب' : (absCups === 1 ? 'cup' : 'cups')}
                  </div>
                </div>
              </div>
              <div className={`mt-2 pt-2 border-t border-current/20 text-[10px] text-center ${textClass} opacity-80`}>
                {lang === 'ar'
                  ? `من ${initialMl}ml (${initialCups.toFixed(1)} كوب) إلى ${ml}ml (${cups.toFixed(1)} كوب)`
                  : `From ${initialMl}ml (${initialCups.toFixed(1)} cups) to ${ml}ml (${cups.toFixed(1)} cups)`}
              </div>
            </motion.div>
          );
        })()}

        {/* Confirm button */}
        {onConfirm && hasCorrection && (
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
              confirmed
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-gold-gradient text-white shadow-lg shadow-gold-600/20 active:scale-98'
            }`}
          >
            {confirmed
              ? (lang === 'ar' ? '✓ تم حفظ التصحيح' : '✓ Correction saved')
              : (lang === 'ar' ? 'حفظ التصحيح' : 'Save correction')}
          </button>
        )}

        {/* Hint */}
        <p className="text-center text-gold-500 text-[10px] mt-2 leading-relaxed">
          {lang === 'ar'
            ? '💡 اسحب المقبض على يسار الزجاجة لتعديل المستوى يدويًا'
            : '💡 Drag the handle on the left of the bottle to adjust the level manually'}
        </p>
      </div>
    </div>
  );
}

// Snap a raw ml value to the nearest step, clamped to [0, totalMl]
function snapToStep(rawMl: number, stepMl: number, totalMl: number): number {
  const snapped = Math.round(rawMl / stepMl) * stepMl;
  return Math.max(0, Math.min(totalMl, snapped));
}
