'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
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

// Offsets to trim the bounding box to just the oil column area
const OIL_COLUMN_TOP_OFFSET = 0.04;
const OIL_COLUMN_BOTTOM_OFFSET = 0.02;

// How many cup steps are available (e.g. stepMl=100, cupMl=200 → step = 0.5 cups)
function buildSteps(maxCups: number, cupStep: number) {
  const steps: { cups: number; label: string; arLabel: string }[] = [];
  let c = 0;
  while (c <= maxCups + 0.001) {
    steps.push({
      cups: c,
      label: formatCupFraction(c),
      arLabel: arabicCupLabel(c),
    });
    c = Math.round((c + cupStep) * 100) / 100;
  }
  return steps;
}

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
  const [imgReady, setImgReady] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 1, h: 1 });
  const [confirmed, setConfirmed] = useState(false);

  // cupStep in cup units (e.g. 0.5 if stepMl=100 and cupMl=200)
  const cupStep = stepMl / cupMl;

  // Maximum cups that can be measured downward from the oil surface
  // (can't go below the bottle bottom, i.e. can't exceed initialMl worth of travel)
  const maxCups = Math.floor((initialMl / cupMl) / cupStep) * cupStep;

  const steps = buildSteps(maxCups, cupStep);

  // slider index (integer 0..steps.length-1)
  const [sliderIndex, setSliderIndex] = useState(0);
  const selectedCups = steps[sliderIndex]?.cups ?? 0;
  const selectedMl = Math.round(selectedCups * cupMl);

  // --- Geometry helpers ---

  const computeBbox = useCallback(() => {
    const img = imgRef.current;
    if (!img || !imgReady) return null;

    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    // Scale from natural image pixels → displayed pixels
    const scaleX = rect.width / bottleBbox.image_w;
    const scaleY = rect.height / bottleBbox.image_h;

    const bx = bottleBbox.x * scaleX;
    const by = bottleBbox.y * scaleY;
    const bw = bottleBbox.w * scaleX;
    const bh = bottleBbox.h * scaleY;

    // The vertical range of the "oil column" inside the bottle bbox
    const oilTopY    = by + bh * OIL_COLUMN_TOP_OFFSET;
    const oilBottomY = by + bh * (1 - OIL_COLUMN_BOTTOM_OFFSET);
    const oilRange   = oilBottomY - oilTopY; // pixels per totalMl

    // Detected oil surface Y — this is the FIXED reference point
    // initialMl tells us how much oil is in the bottle, so the surface is
    // at distance (initialMl / totalMl) * oilRange above oilBottomY.
    const surfaceY = oilBottomY - (initialMl / totalMl) * oilRange;

    return { bx, by, bw, bh, oilTopY, oilBottomY, oilRange, surfaceY, rect };
  }, [bottleBbox, initialMl, totalMl, imgReady]);

  // Track display size for re-render on resize
  useEffect(() => {
    const updateSize = () => {
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      setImgDisplaySize({ w: rect.width, h: rect.height });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (imgRef.current) ro.observe(imgRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    const rect = img.getBoundingClientRect();
    setImgDisplaySize({ w: rect.width, h: rect.height });
    setImgReady(true);
  };

  // Framer Motion spring for the animated measurement line Y position
  const springY = useSpring(0, { stiffness: 260, damping: 28 });
  const arrowY = useTransform(springY, (v) => v - 4);

  const bbox = computeBbox();
  void imgNaturalSize; // referenced to trigger re-compute when natural size changes

  // Compute the Y position of the measurement line:
  // surfaceY + (selectedMl / totalMl) * oilRange
  // As selectedMl grows → measuredY moves downward (larger Y value).
  let measuredY = 0;
  if (bbox) {
    const downwardPx = (selectedMl / totalMl) * bbox.oilRange;
    measuredY = Math.min(bbox.oilBottomY, bbox.surfaceY + downwardPx);
  }

  useEffect(() => {
    if (bbox) springY.set(measuredY);
  }, [measuredY, bbox, springY]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setSliderIndex(idx);
    setConfirmed(false);
    const cups = steps[idx]?.cups ?? 0;
    // Report the remaining oil level (oil surface level minus cups taken)
    onChange?.(Math.max(0, initialMl - cups * cupMl));
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm?.(Math.max(0, initialMl - selectedMl));
  };

  const arLabel  = arabicCupLabel(selectedCups);
  const enLabel  = `${formatCupFraction(selectedCups)} cup`;
  const cupLabel = lang === 'ar' ? arLabel : enLabel;

  return (
    <div
      className="w-full rounded-3xl p-4 sm:p-5"
      style={{
        background: 'linear-gradient(180deg, #FBF3E6 0%, #F8ECD8 100%)',
        boxShadow: '0 10px 24px rgba(120,94,42,0.12)',
      }}
    >
      <div className="mx-auto w-full max-w-sm">

        {/* ── Bottle image + SVG overlay ── */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ background: '#F4E5CA' }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Bottle scan"
            className="w-full h-auto block"
            onLoad={handleImgLoad}
            draggable={false}
          />

          {bbox && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={imgDisplaySize.w}
              height={imgDisplaySize.h}
              style={{ left: 0, top: 0 }}
            >
              {/* ── Vertical ml scale (right of bottle) ── */}
              {[0, 300, 600, 900, 1200, 1500].map((tickMl) => {
                const ratio = tickMl / totalMl;
                const y = bbox.oilBottomY - ratio * bbox.oilRange;
                return (
                  <g key={tickMl}>
                    <line
                      x1={bbox.bx + bbox.bw + 6}
                      y1={y}
                      x2={bbox.bx + bbox.bw + 16}
                      y2={y}
                      stroke="#9B7A2C"
                      strokeWidth="1.4"
                      strokeOpacity="0.7"
                    />
                    <text
                      x={bbox.bx + bbox.bw + 19}
                      y={y + 3.5}
                      fill="#7A5D20"
                      fontSize="8.5"
                      fontWeight="700"
                    >
                      {tickMl} ml
                    </text>
                  </g>
                );
              })}

              {/* ── Fixed oil surface line ── */}
              <line
                x1={bbox.bx - 5}
                y1={bbox.surfaceY}
                x2={bbox.bx + bbox.bw + 5}
                y2={bbox.surfaceY}
                stroke="#F5B700"
                strokeWidth="2.5"
                strokeOpacity="0.85"
              />
              <text
                x={bbox.bx + 8}
                y={bbox.surfaceY - 5}
                fill="#7A5D20"
                fontSize="8"
                fontWeight="700"
              >
                {lang === 'ar' ? 'سطح الزيت' : 'Oil surface'}
              </text>

              {/* ── Animated measurement line (moves DOWN as cups increase) ── */}
              {selectedCups > 0 && (
                <>
                  {/* Dashed animated line */}
                  <motion.line
                    x1={bbox.bx - 5}
                    x2={bbox.bx + bbox.bw + 5}
                    stroke="#F5B700"
                    strokeWidth="2.8"
                    strokeDasharray="6 3"
                    style={{ y: springY }}
                  />

                  {/* Arrow showing direction ↓ */}
                  <motion.text
                    x={bbox.bx - 14}
                    fill="#F5B700"
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                    style={{ y: arrowY }}
                  >
                    ↓
                  </motion.text>

                  {/* Floating label bubble */}
                  <motion.g style={{ y: springY }}>
                    <rect
                      x={bbox.bx + 5}
                      y={-20}
                      width={72}
                      height={16}
                      rx={8}
                      fill="#FFF5D6"
                      stroke="#F5B700"
                      strokeWidth="1"
                    />
                    <text
                      x={bbox.bx + 41}
                      y={-9}
                      textAnchor="middle"
                      fill="#7A5D20"
                      fontSize="8.5"
                      fontWeight="700"
                    >
                      {lang === 'ar' ? arLabel : `${selectedMl} ml`}
                    </text>
                  </motion.g>

                  {/* Vertical distance indicator between surface and line */}
                  <motion.line
                    x1={bbox.bx - 5}
                    y1={bbox.surfaceY}
                    x2={bbox.bx - 5}
                    y2={springY}
                    stroke="#F5B700"
                    strokeWidth="1.2"
                    strokeOpacity="0.5"
                    strokeDasharray="2 2"
                  />
                </>
              )}
            </svg>
          )}
        </div>

        {/* ── Horizontal cup slider ── */}
        <div
          className="mt-4 rounded-2xl p-4"
          style={{
            background: '#FFF8EC',
            boxShadow: 'inset 0 0 0 1px #F3E3BE',
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#7A5D20]">
              {lang === 'ar' ? 'اختاري المستوى' : 'Select level'}
            </span>
            <span className="bg-[#FFE7A3] text-[#7A5D20] px-3 py-0.5 rounded-full text-sm font-semibold">
              {lang === 'ar' ? arLabel : formatCupFraction(selectedCups) + ' cup'}
            </span>
          </div>

          {/*
            SLIDER — RTL layout (Arabic):
            - Visually: 0 on the RIGHT, max on the LEFT (RTL)
            - Thumb moves LEFT → more cups → line moves DOWN in bottle
            - We use direction:rtl on the wrapper so the native range input
              reverses naturally. The raw value still increases left→right
              internally, but visually it's right→left.
            - To keep logic consistent, we store sliderIndex as 0=min cups,
              but render the input with direction:rtl so 0 appears on the right.
          */}
          <div style={{ direction: 'rtl' }}>
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              step={1}
              value={sliderIndex}
              onChange={handleSliderChange}
              className="w-full accent-[#F5B700]"
              aria-label={lang === 'ar' ? 'مستوى الأكواب' : 'Cup level'}
            />
          </div>

          {/* Tick marks — rendered RTL: max value on left, 0 on right */}
          <div className="mt-2 overflow-x-auto pb-1" style={{ direction: 'rtl' }}>
            <div
              style={{ minWidth: `${steps.length * 48}px` }}
              className="flex items-start justify-between px-0.5"
            >
              {/* Reverse the steps array so largest cup value is on the left */}
              {[...steps].reverse().map((s) => (
                <div key={s.cups} className="flex flex-col items-center" style={{ width: 44 }}>
                  <span className="w-[2px] h-3 rounded bg-[#D6B66F]" />
                  <span className="text-[11px] text-[#7A5D20] font-semibold mt-1 whitespace-nowrap">
                    {s.label}
                  </span>
                  <span className="text-[10px] text-[#A17F34] mt-0.5 whitespace-nowrap">
                    {s.arLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ml readout */}
          <p className="text-center text-sm font-semibold text-[#8D6E2F] mt-3">
            {arLabel} = {selectedMl} ml
          </p>
          <p className="text-center text-xs text-[#A17F34] mt-1">
            1 كوب = {cupMl} ml
          </p>

          {/* Confirm button */}
          {onConfirm && (
            <button
              onClick={handleConfirm}
              disabled={confirmed}
              className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                confirmed
                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                  : 'bg-[#F8D56A] text-[#6C4D13] active:scale-[0.99]'
              }`}
            >
              {confirmed
                ? (lang === 'ar' ? '✓ تم حفظ التصحيح' : '✓ Correction saved')
                : (lang === 'ar' ? 'حفظ التصحيح'      : 'Save correction')}
            </button>
          )}

          {/* Summary */}
          <p className="text-center text-xs text-[#A17F34] mt-2">
            {lang === 'ar'
              ? `القياس من سطح الزيت: ${cupLabel} (${selectedMl} ml)`
              : `Measured from oil surface: ${cupLabel} (${selectedMl} ml)`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format cups as a fraction string: 0 → "0", 0.5 → "1/2", 1.5 → "1 1/2" */
function formatCupFraction(cups: number): string {
  const rounded = Math.round(cups * 2) / 2;
  const whole = Math.floor(rounded);
  const half  = rounded - whole;

  if (whole === 0 && half === 0.5) return '1/2';
  if (half === 0)                  return `${whole}`;
  return `${whole} 1/2`;
}

/** Arabic cup label */
function arabicCupLabel(cups: number): string {
  const rounded = Math.round(cups * 2) / 2;
  if (rounded === 0)   return '0 كوب';
  if (rounded === 0.5) return 'نص كوب';
  if (rounded % 1 === 0) return `${rounded} كوب`;
  const whole = Math.floor(rounded);
  return `${whole} نص كوب`;
}
