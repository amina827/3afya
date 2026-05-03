'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import type { BottleBBox } from '@/services/api';

interface InteractiveBottleSliderProps {
  imageUrl: string;
  bottleBbox: BottleBBox;
  initialMl: number;
  totalMl?: number;
  cupMl?: number;
  stepMl?: number;
  onChange?: (ml: number) => void;
  onConfirm?: (ml: number) => void;
}

const OIL_COLUMN_TOP_OFFSET = 0.04;
const OIL_COLUMN_BOTTOM_OFFSET = 0.02;

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
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);
  const [ml, setMl] = useState(() => snapToStep(initialMl, stepMl, totalMl));
  const [confirmed, setConfirmed] = useState(false);

  const cups = ml / cupMl;
  const ratio = ml / totalMl;
  const cupStep = stepMl / cupMl;
  const maxCups = totalMl / cupMl;

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
      oilTopY: bottleBbox.y * scaleY + bottleBbox.h * scaleY * OIL_COLUMN_TOP_OFFSET,
      oilBottomY: bottleBbox.y * scaleY + bottleBbox.h * scaleY * (1 - OIL_COLUMN_BOTTOM_OFFSET),
    };
  }, [bottleBbox]);

  useEffect(() => {
    const updateRect = () => {
      const img = imgRef.current;
      if (img) setImgRect(img.getBoundingClientRect());
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
  void imgRect;

  const sliderToMl = (nextCups: number) => {
    const nextMl = snapToStep(nextCups * cupMl, stepMl, totalMl);
    setMl(nextMl);
    setConfirmed(false);
    onChange?.(nextMl);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm?.(ml);
  };

  const cupTicks = Array.from({ length: Math.floor(maxCups / cupStep) + 1 }, (_, i) => {
    const value = Number((i * cupStep).toFixed(2));
    return {
      cupsValue: value,
      mlValue: Math.round(value * cupMl),
      label: formatCupFraction(value),
      arLabel: arabicCupLabel(value),
    };
  });

  const highlightedCupLabel = lang === 'ar' ? arabicCupLabel(cups) : `${formatCupFraction(cups)} cup`;

  return (
    <div
      className="w-full rounded-3xl p-4 sm:p-5"
      style={{
        background: 'linear-gradient(180deg, #FBF3E6 0%, #F8ECD8 100%)',
        boxShadow: '0 10px 24px rgba(120, 94, 42, 0.12)',
      }}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="relative rounded-3xl overflow-hidden" style={{ background: '#F4E5CA' }}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Bottle scan"
            className="w-full h-auto block"
            onLoad={handleImgLoad}
            draggable={false}
          />

          {bbox && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Vertical ml scale */}
              {Array.from({ length: 6 }, (_, i) => {
                const tickMl = i * 300;
                const tickRatio = tickMl / totalMl;
                const y = bbox.oilBottomY - tickRatio * (bbox.oilBottomY - bbox.oilTopY);
                return (
                  <g key={tickMl}>
                    <line
                      x1={bbox.x + bbox.w + 8}
                      y1={y}
                      x2={bbox.x + bbox.w + 18}
                      y2={y}
                      stroke="#9B7A2C"
                      strokeWidth="1.6"
                      strokeOpacity="0.75"
                    />
                    <text
                      x={bbox.x + bbox.w + 21}
                      y={y + 3}
                      fill="#7A5D20"
                      fontSize="9"
                      fontWeight="700"
                    >
                      {tickMl} ml
                    </text>
                  </g>
                );
              })}

              {/* Current selected level line */}
              <motion.line
                x1={bbox.x - 4}
                y1={bbox.oilBottomY - ratio * (bbox.oilBottomY - bbox.oilTopY)}
                x2={bbox.x + bbox.w + 6}
                y2={bbox.oilBottomY - ratio * (bbox.oilBottomY - bbox.oilTopY)}
                stroke="#F5B700"
                strokeWidth="3"
                strokeDasharray="6 3"
                style={{ filter: 'drop-shadow(0 0 6px rgba(245, 183, 0, 0.75))' }}
                animate={{
                  y1: bbox.oilBottomY - ratio * (bbox.oilBottomY - bbox.oilTopY),
                  y2: bbox.oilBottomY - ratio * (bbox.oilBottomY - bbox.oilTopY),
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              />

              {/* Floating selected label */}
              <g>
                <rect
                  x={bbox.x + 4}
                  y={bbox.oilBottomY - ratio * (bbox.oilBottomY - bbox.oilTopY) - 20}
                  width="74"
                  height="16"
                  rx="8"
                  fill="#FFF5D6"
                  stroke="#F5B700"
                  strokeWidth="1"
                />
                <text
                  x={bbox.x + 41}
                  y={bbox.oilBottomY - ratio * (bbox.oilBottomY - bbox.oilTopY) - 9}
                  textAnchor="middle"
                  fill="#7A5D20"
                  fontSize="8.5"
                  fontWeight="700"
                >
                  {lang === 'ar' ? arabicCupLabel(cups) : `${ml} ml`}
                </text>
              </g>
            </svg>
          )}
        </div>

        {/* Horizontal cup slider */}
        <div className="mt-4 rounded-2xl p-4" style={{ background: '#FFF8EC', boxShadow: 'inset 0 0 0 1px #F3E3BE' }}>
          <div className="flex items-center justify-between mb-2 text-sm font-semibold text-[#7A5D20]">
            <span>{lang === 'ar' ? 'اختاري المستوى' : 'Select level'}</span>
            <span className="bg-[#FFE7A3] px-2 py-0.5 rounded-full">{formatCupFraction(cups)} {lang === 'ar' ? 'كوب' : 'cup'}</span>
          </div>

          <input
            type="range"
            min={0}
            max={maxCups}
            step={cupStep}
            value={Number(cups.toFixed(2))}
            onChange={(e) => sliderToMl(Number(e.target.value))}
            className="w-full accent-[#F5B700]"
            aria-label={lang === 'ar' ? 'مستوى الأكواب' : 'Cup level'}
          />

          <div className="mt-3 overflow-x-auto pb-1">
            <div className="min-w-[640px] flex items-start justify-between px-0.5">
              {cupTicks.map((tick) => (
                <div key={tick.cupsValue} className="flex flex-col items-center w-10">
                  <span className="w-[2px] h-3 rounded bg-[#D6B66F]" />
                  <span className="text-[11px] text-[#7A5D20] font-semibold mt-1">{tick.label}</span>
                  <span className="text-[10px] text-[#A17F34] mt-0.5 whitespace-nowrap">{tick.arLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm font-semibold text-[#8D6E2F] mt-3">
            {arabicCupLabel(cups)} = {ml} ml
          </p>

          {onConfirm && (
            <button
              onClick={handleConfirm}
              disabled={confirmed}
              className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                confirmed
                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                  : 'text-[#6C4D13] bg-[#F8D56A] active:scale-[0.99]'
              }`}
            >
              {confirmed
                ? (lang === 'ar' ? '✓ تم حفظ التصحيح' : '✓ Correction saved')
                : (lang === 'ar' ? 'حفظ التصحيح' : 'Save correction')}
            </button>
          )}

          <p className="text-center text-xs text-[#A17F34] mt-2">
            {lang === 'ar'
              ? `المستوى الحالي: ${highlightedCupLabel} (${ml} ml)`
              : `Current level: ${highlightedCupLabel} (${ml} ml)`}
          </p>
        </div>
      </div>
    </div>
  );
}

function snapToStep(rawMl: number, stepMl: number, totalMl: number): number {
  const snapped = Math.round(rawMl / stepMl) * stepMl;
  return Math.max(0, Math.min(totalMl, snapped));
}

function formatCupFraction(cups: number): string {
  const rounded = Math.round(cups * 2) / 2;
  const whole = Math.floor(rounded);
  const half = rounded - whole;

  if (whole === 0 && half === 0.5) return '1/2';
  if (half === 0) return `${whole}`;
  return `${whole} 1/2`;
}

function arabicCupLabel(cups: number): string {
  const rounded = Math.round(cups * 2) / 2;

  if (rounded === 0.5) return 'نص كوب';
  if (rounded % 1 === 0) return `${rounded} كوب`;
  return `${rounded} كوب`;
}
