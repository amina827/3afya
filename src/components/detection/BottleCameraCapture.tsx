'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

interface BottleCameraCaptureProps {
  onCapture: (files: File[]) => void;
}

type AlignState = 'searching' | 'far' | 'close' | 'aligned' | 'capturing';
type CaptureStage = 'neck' | 'base' | 'done';

interface DetectionResult {
  found: boolean;
  cx: number; // center x normalized 0-1
  cy: number;
  width: number; // bbox width normalized
  height: number;
  fillRatio: number; // density of yellow inside bbox
  hasLabel: boolean; // green/red label colors detected
  yellowCount: number;
  centroidTop: number; // y of top quartile of yellow
  centroidBottom: number; // y of bottom quartile of yellow
}

interface QualityChecks {
  brightness: number; // 0-1 (0=too dark, 1=ok)
  sharpness: number;  // 0-1 (0=blurry, 1=sharp)
  motion: number;     // 0-1 (0=moving, 1=still)
  tilt: number;       // 0-1 (0=tilted, 1=upright)
}

// Frame guide position (centered, normalized 0-1 of viewBox 100×133)
// Full bottle bounding box (with handle): x=12..80, y=7..123 → w=68, h=116
// Volume range (1500ml at shoulder line, 0ml at base line): y=22..113
const FRAME = {
  cx: 46 / 100,     // (12+80)/2 / 100 = 0.46
  cy: 65 / 133,     // (7+123)/2 / 133 ≈ 0.489
  width: 68 / 100,   // 0.68
  height: 116 / 133, // ≈ 0.872
};

// The volume range within the frame (where ml/% markers go)
// Fill-level line (1500 cc) is at the shoulder: y≈22
// Base line (oil column bottom): y≈113
const VOLUME_TOP_Y = 22;
const VOLUME_BOTTOM_Y = 113;

// Quality thresholds
const MIN_BRIGHTNESS = 0.45;
const MIN_SHARPNESS = 0.40;
const MIN_MOTION_STABILITY = 0.70;
const MIN_TILT_OK = 0.75;
const MIN_ALIGN_SCORE = 0.78;
const STABLE_FRAMES_REQUIRED = 8; // ~1.6s of consecutive aligned frames

export function BottleCameraCapture({ onCapture }: BottleCameraCaptureProps) {
  const { lang } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Multi-frame state
  const stableFramesRef = useRef(0);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastDetectRef = useRef(0);
  const sharpnessHistoryRef = useRef<number[]>([]);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [alignState, setAlignState] = useState<AlignState>('searching');
  const [score, setScore] = useState(0);
  const [autoCapture, setAutoCapture] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [captureStage, setCaptureStage] = useState<CaptureStage>('neck');
  const neckCaptureRef = useRef<Blob | null>(null);
  const [quality, setQuality] = useState<QualityChecks>({
    brightness: 0,
    sharpness: 0,
    motion: 0,
    tilt: 1,
  });
  const [countdown, setCountdown] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  // ========================================
  // Detect bottle in current video frame
  // ========================================
  const detectBottle = useCallback((): { detection: DetectionResult; checks: QualityChecks } => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const empty: DetectionResult = {
      found: false, cx: 0, cy: 0, width: 0, height: 0,
      fillRatio: 0, hasLabel: false, yellowCount: 0, centroidTop: 0, centroidBottom: 0,
    };
    const emptyChecks: QualityChecks = { brightness: 0, sharpness: 0, motion: 0, tilt: 1 };

    if (!video || !canvas || video.readyState < 2) {
      return { detection: empty, checks: emptyChecks };
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { detection: empty, checks: emptyChecks };

    // Process at modest resolution for performance
    const w = 180;
    const h = 240;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Frame bounds in canvas pixel coordinates
    // Only analyze pixels INSIDE the frame (ignore everything outside)
    const frameLeft = Math.floor(w * (FRAME.cx - FRAME.width / 2));
    const frameRight = Math.ceil(w * (FRAME.cx + FRAME.width / 2));
    const frameTop = Math.floor(h * (FRAME.cy - FRAME.height / 2));
    const frameBottom = Math.ceil(h * (FRAME.cy + FRAME.height / 2));

    // ----- 1. Detect yellow (oil + label background) and label colors -----
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let yellowCount = 0;
    let labelColorCount = 0; // green or red pixels
    let brightnessSum = 0;
    let pixelCount = 0;
    const yPositions: number[] = [];

    // Iterate ONLY inside the frame bounds
    for (let y = frameTop; y < frameBottom; y++) {
      for (let x = frameLeft; x < frameRight; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Brightness (luma) - measured only inside frame
        brightnessSum += 0.299 * r + 0.587 * g + 0.114 * b;
        pixelCount++;

        // Yellow / golden
        const isYellow =
          r > 140 && g > 110 && b < 180 &&
          r - b > 30 && Math.abs(r - g) < 70 && g > b;

        // Label green (Afia heart)
        const isGreen = g > 100 && g - r > 20 && g - b > 20;

        // Label red (corn/decoration)
        const isRed = r > 130 && r - g > 30 && r - b > 30;

        if (isYellow) {
          yellowCount++;
          yPositions.push(y);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        if (isGreen || isRed) {
          labelColorCount++;
        }
      }
    }

    const totalPixels = pixelCount > 0 ? pixelCount : w * h;
    const avgBrightness = brightnessSum / totalPixels / 255; // 0-1

    // ----- 2. Sharpness via Laplacian variance on grayscale (frame only) -----
    let lapSum = 0;
    let lapSqSum = 0;
    let lapCount = 0;
    const sharpYStart = Math.max(1, frameTop);
    const sharpYEnd = Math.min(h - 1, frameBottom);
    const sharpXStart = Math.max(1, frameLeft);
    const sharpXEnd = Math.min(w - 1, frameRight);
    for (let y = sharpYStart; y < sharpYEnd; y += 2) {
      for (let x = sharpXStart; x < sharpXEnd; x += 2) {
        const i = (y * w + x) * 4;
        const c = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const u = (y - 1) * w * 4 + x * 4;
        const cu = 0.299 * data[u] + 0.587 * data[u + 1] + 0.114 * data[u + 2];
        const d = (y + 1) * w * 4 + x * 4;
        const cd = 0.299 * data[d] + 0.587 * data[d + 1] + 0.114 * data[d + 2];
        const l = (y * w + (x - 1)) * 4;
        const cl = 0.299 * data[l] + 0.587 * data[l + 1] + 0.114 * data[l + 2];
        const rr = (y * w + (x + 1)) * 4;
        const cr = 0.299 * data[rr] + 0.587 * data[rr + 1] + 0.114 * data[rr + 2];
        const lap = cu + cd + cl + cr - 4 * c;
        lapSum += lap;
        lapSqSum += lap * lap;
        lapCount++;
      }
    }
    const lapMean = lapSum / lapCount;
    const lapVar = lapSqSum / lapCount - lapMean * lapMean;
    // Normalize: typical sharp images have variance > 800, blurry < 100
    const sharpness = Math.min(1, Math.max(0, (lapVar - 80) / 600));

    // ----- 3. Motion (frame-to-frame difference) -----
    let motion = 1;
    if (prevFrameRef.current && prevFrameRef.current.length === data.length) {
      let diffSum = 0;
      // Sample every 8 pixels for speed
      for (let i = 0; i < data.length; i += 32) {
        diffSum += Math.abs(data[i] - prevFrameRef.current[i]);
      }
      const sampleCount = Math.floor(data.length / 32);
      const avgDiff = diffSum / sampleCount;
      // 0 diff = perfectly still (motion=1), 30+ = moving (motion=0)
      motion = Math.max(0, Math.min(1, 1 - avgDiff / 25));
    }
    prevFrameRef.current = new Uint8ClampedArray(data);

    if (yellowCount < 200) {
      return {
        detection: empty,
        checks: { brightness: avgBrightness, sharpness, motion, tilt: 1 },
      };
    }

    const bbW = maxX - minX;
    const bbH = maxY - minY;
    const bbArea = bbW * bbH;
    const fillRatio = bbArea > 0 ? yellowCount / bbArea : 0;
    const labelDensity = labelColorCount / totalPixels;

    // ----- 4. Tilt detection -----
    // For an upright bottle, the yellow column's left and right edges should
    // be approximately vertical. We compare the center X at the top half vs
    // bottom half of the bbox.
    let topCenterX = 0, topCount = 0;
    let botCenterX = 0, botCount = 0;
    const midY = minY + bbH / 2;
    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isYellow = r > 140 && g > 110 && b < 180 && r - b > 30 && Math.abs(r - g) < 70 && g > b;
        if (isYellow) {
          if (y < midY) { topCenterX += x; topCount++; }
          else { botCenterX += x; botCount++; }
        }
      }
    }
    const tlCx = topCount > 0 ? topCenterX / topCount : bbW / 2 + minX;
    const blCx = botCount > 0 ? botCenterX / botCount : bbW / 2 + minX;
    const tiltDelta = Math.abs(tlCx - blCx) / Math.max(1, bbW);
    // tiltDelta close to 0 = upright, > 0.15 = tilted
    const tilt = Math.max(0, Math.min(1, 1 - tiltDelta * 5));

    return {
      detection: {
        found: true,
        cx: (minX + bbW / 2) / w,
        cy: (minY + bbH / 2) / h,
        width: bbW / w,
        height: bbH / h,
        fillRatio,
        hasLabel: labelDensity > 0.005,
        yellowCount,
        centroidTop: minY / h,
        centroidBottom: maxY / h,
      },
      checks: { brightness: avgBrightness, sharpness, motion, tilt },
    };
  }, []);

  // ========================================
  // Score the alignment between detection and frame guide
  // ========================================
  const scoreAlignment = useCallback((det: DetectionResult): number => {
    if (!det.found) return 0;

    // Position match
    const dxCenter = Math.abs(det.cx - FRAME.cx);
    const dyCenter = Math.abs(det.cy - FRAME.cy);
    const positionScore = Math.max(0, 1 - (dxCenter * 4 + dyCenter * 4));

    // Size match - want detection to roughly fill the frame
    const widthRatio = det.width / FRAME.width;
    const heightRatio = det.height / FRAME.height;
    const sizeScore =
      Math.max(0, 1 - Math.abs(widthRatio - 1) * 1.5) *
      Math.max(0, 1 - Math.abs(heightRatio - 1) * 1.5);

    // Fill ratio
    const fillScore = Math.min(1, det.fillRatio * 2);

    // Aspect ratio
    const detAspect = det.height / Math.max(0.01, det.width);
    const aspectScore = detAspect > 1.2 && detAspect < 2.5 ? 1 : 0.3;

    // Label present (genuine Afia bottle has visible label)
    const labelScore = det.hasLabel ? 1 : 0.4;

    return (
      positionScore * 0.30 +
      sizeScore * 0.35 +
      fillScore * 0.12 +
      aspectScore * 0.10 +
      labelScore * 0.13
    );
  }, []);

  // ========================================
  // Build warnings list based on quality checks and alignment
  // ========================================
  const buildWarnings = useCallback(
    (det: DetectionResult, q: QualityChecks, alignScore: number): string[] => {
      const w: string[] = [];
      const arabic = lang === 'ar';

      if (q.brightness < MIN_BRIGHTNESS) {
        w.push(arabic ? '🔆 الإضاءة ضعيفة' : '🔆 Too dark');
      } else if (q.brightness > 0.92) {
        w.push(arabic ? '☀️ الصورة مُعرّضة للضوء بشدة' : '☀️ Overexposed');
      }
      if (q.sharpness < MIN_SHARPNESS) {
        w.push(arabic ? '🌫️ الصورة غير واضحة' : '🌫️ Blurry');
      }
      if (q.motion < MIN_MOTION_STABILITY) {
        w.push(arabic ? '✋ ثبّت الكاميرا' : '✋ Hold steady');
      }
      if (det.found && q.tilt < MIN_TILT_OK) {
        w.push(arabic ? '📐 الزجاجة مائلة - عدّل الكاميرا' : '📐 Bottle tilted');
      }
      if (det.found && !det.hasLabel) {
        w.push(arabic ? '🏷️ اللصاقة مش ظاهرة' : '🏷️ Label not visible');
      }
      if (det.found && alignScore < 0.55) {
        const widthRatio = det.width / FRAME.width;
        if (widthRatio < 0.7) {
          w.push(arabic ? '➡️ قرّب الكاميرا أكتر' : '➡️ Move closer');
        } else if (widthRatio > 1.3) {
          w.push(arabic ? '⬅️ ابعد شويه' : '⬅️ Move back');
        }
      }
      return w;
    },
    [lang],
  );

  // ========================================
  // Compute Laplacian variance (sharpness) on a canvas region
  // ========================================
  const computeSharpness = useCallback((canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    // Sample a smaller region for speed
    const w = Math.min(canvas.width, 300);
    const h = Math.min(canvas.height, 400);
    const sx = Math.floor((canvas.width - w) / 2);
    const sy = Math.floor((canvas.height - h) / 2);
    const data = ctx.getImageData(sx, sy, w, h).data;

    let lapSum = 0;
    let lapSqSum = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y += 2) {
      for (let x = 1; x < w - 1; x += 2) {
        const i = (y * w + x) * 4;
        const c = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const u = (y - 1) * w * 4 + x * 4;
        const cu = 0.299 * data[u] + 0.587 * data[u + 1] + 0.114 * data[u + 2];
        const d = (y + 1) * w * 4 + x * 4;
        const cd = 0.299 * data[d] + 0.587 * data[d + 1] + 0.114 * data[d + 2];
        const l = (y * w + (x - 1)) * 4;
        const cl = 0.299 * data[l] + 0.587 * data[l + 1] + 0.114 * data[l + 2];
        const rr = (y * w + (x + 1)) * 4;
        const cr = 0.299 * data[rr] + 0.587 * data[rr + 1] + 0.114 * data[rr + 2];
        const lap = cu + cd + cl + cr - 4 * c;
        lapSum += lap;
        lapSqSum += lap * lap;
        count++;
      }
    }
    const lapMean = lapSum / count;
    return lapSqSum / count - lapMean * lapMean;
  }, []);

  // ========================================
  // Snapshot the FRAME area + 15% margin into a canvas.
  // This produces a consistent crop across all captures so the backend
  // detection finds the bottle in the same relative position every time.
  // ========================================
  const snapshotVideo = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const containerAspect = 3 / 4;
    const videoAspect = vw / vh;

    let visibleVw = vw;
    let visibleVh = vh;
    let offsetX = 0;
    let offsetY = 0;

    if (videoAspect > containerAspect) {
      visibleVw = vh * containerAspect;
      offsetX = (vw - visibleVw) / 2;
    } else {
      visibleVh = vw / containerAspect;
      offsetY = (vh - visibleVh) / 2;
    }

    // Crop to FRAME + 15% margin for consistent bottle position
    const MARGIN = 0.15;
    const frameW = visibleVw * FRAME.width;
    const frameH = visibleVh * FRAME.height;
    const frameLeft = visibleVw * (FRAME.cx - FRAME.width / 2);
    const frameTop = visibleVh * (FRAME.cy - FRAME.height / 2);

    const padX = frameW * MARGIN;
    const padY = frameH * MARGIN;

    let cropX = offsetX + frameLeft - padX;
    let cropY = offsetY + frameTop - padY;
    let cropW = frameW + 2 * padX;
    let cropH = frameH + 2 * padY;

    // Clamp to video bounds
    if (cropX < 0) { cropW += cropX; cropX = 0; }
    if (cropY < 0) { cropH += cropY; cropY = 0; }
    if (cropX + cropW > vw) cropW = vw - cropX;
    if (cropY + cropH > vh) cropH = vh - cropY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(
      video,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH,
    );
    return canvas;
  }, []);

  // ========================================
  // Capture: take N quick frames, return the sharpest TOP_K of them
  // ========================================
  const captureMultipleSharp = useCallback(async (numFrames: number, topK: number): Promise<Blob[]> => {
    const FRAME_DELAY = 50; // ms between frames
    const candidates: { canvas: HTMLCanvasElement; sharpness: number }[] = [];

    for (let i = 0; i < numFrames; i++) {
      const canvas = snapshotVideo();
      if (canvas) {
        const sharpness = computeSharpness(canvas);
        candidates.push({ canvas, sharpness });
      }
      if (i < numFrames - 1) {
        await new Promise((r) => setTimeout(r, FRAME_DELAY));
      }
    }

    if (candidates.length === 0) return [];

    // Pick the top K sharpest frames
    candidates.sort((a, b) => b.sharpness - a.sharpness);
    const topCandidates = candidates.slice(0, topK);

    // Convert each to blob
    const blobs: Blob[] = [];
    for (const cand of topCandidates) {
      const blob = await new Promise<Blob | null>((resolve) => {
        cand.canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
      });
      if (blob) blobs.push(blob);
    }
    return blobs;
  }, [snapshotVideo, computeSharpness]);

  // ========================================
  // Capture stage flow:
  //   neck stage → take 3 sharpest frames, save as neck samples
  //   base stage → take 3 sharpest frames, save as base samples
  //   send all 6 frames to backend for median analysis
  // ========================================
  const neckSamplesRef = useRef<Blob[]>([]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || captured) return;

    setAlignState('capturing');

    // Capture 5 frames, pick top 3 sharpest
    const sharpBlobs = await captureMultipleSharp(5, 3);
    if (sharpBlobs.length === 0) return;

    if (captureStage === 'neck') {
      // Save the 3 neck samples, advance to base stage
      neckSamplesRef.current = sharpBlobs;
      neckCaptureRef.current = sharpBlobs[0];
      setCaptureStage('base');
      setAlignState('searching');
      stableFramesRef.current = 0;
    } else {
      // Base stage: combine neck + base samples and send all
      setCaptured(true);
      setCaptureStage('done');
      const allBlobs = [...neckSamplesRef.current, ...sharpBlobs];
      const files = allBlobs.map(
        (blob, idx) => new File([blob], `bottle-${Date.now()}-${idx}.jpg`, { type: 'image/jpeg' }),
      );
      onCapture(files);
    }
  }, [captured, captureStage, onCapture, captureMultipleSharp]);

  // ========================================
  // Detection loop (every 200ms)
  // ========================================
  useEffect(() => {
    if (!cameraReady || captured) return;

    const DETECT_INTERVAL = 180;

    const loop = (timestamp: number) => {
      if (timestamp - lastDetectRef.current > DETECT_INTERVAL) {
        const { detection, checks } = detectBottle();
        const alignScore = scoreAlignment(detection);

        // Track sharpness history (rolling window of 5)
        sharpnessHistoryRef.current.push(checks.sharpness);
        if (sharpnessHistoryRef.current.length > 5) {
          sharpnessHistoryRef.current.shift();
        }

        setScore(alignScore);
        setQuality(checks);
        setWarnings(buildWarnings(detection, checks, alignScore));

        // Determine alignment state - ALL conditions must pass
        const qualityOk =
          checks.brightness >= MIN_BRIGHTNESS &&
          checks.brightness <= 0.95 &&
          checks.sharpness >= MIN_SHARPNESS &&
          checks.motion >= MIN_MOTION_STABILITY &&
          checks.tilt >= MIN_TILT_OK;

        let newState: AlignState;
        if (!detection.found) {
          newState = 'searching';
        } else if (alignScore >= MIN_ALIGN_SCORE && qualityOk) {
          newState = 'aligned';
        } else if (alignScore >= 0.55) {
          newState = 'close';
        } else {
          newState = 'far';
        }

        setAlignState(newState);

        // Auto-capture only when ALL conditions are perfect for N consecutive frames
        if (newState === 'aligned') {
          stableFramesRef.current++;
          const stable = stableFramesRef.current;
          // Update countdown (visual)
          const remaining = Math.max(0, STABLE_FRAMES_REQUIRED - stable);
          setCountdown(Math.ceil(remaining / 5));

          if (autoCapture && stable >= STABLE_FRAMES_REQUIRED) {
            captureFrame();
            return;
          }
        } else {
          stableFramesRef.current = 0;
          setCountdown(0);
        }

        lastDetectRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [cameraReady, captured, autoCapture, detectBottle, scoreAlignment, buildWarnings, captureFrame]);

  // ========================================
  // Start camera
  // ========================================
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Camera access denied');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // ========================================
  // Frame color
  // ========================================
  const frameColor =
    alignState === 'capturing' ? '#22c55e' :
    alignState === 'aligned' ? '#22c55e' :
    alignState === 'close' ? '#eab308' :
    alignState === 'far' ? '#ef4444' :
    '#9ca3af';

  const stagePrefix = captureStage === 'neck'
    ? (lang === 'ar' ? '1️⃣ ثبّت عنق الزجاجة' : '1️⃣ Align bottle NECK')
    : captureStage === 'base'
    ? (lang === 'ar' ? '2️⃣ ثبّت قاع الزجاجة' : '2️⃣ Align bottle BASE')
    : '';

  const statusText: Record<AlignState, string> = {
    searching: stagePrefix || (lang === 'ar' ? 'وجّه الكاميرا للزجاجة' : 'Point camera at bottle'),
    far: lang === 'ar' ? 'حطّ الزجاجة داخل الإطار' : 'Place bottle inside frame',
    close: lang === 'ar' ? 'اقترب أكثر وثبّت' : 'Almost there, hold steady',
    aligned: captureStage === 'neck'
      ? (lang === 'ar' ? '✓ العنق متظبط - ثبّت' : '✓ Neck aligned - hold still')
      : (lang === 'ar' ? '✓ القاع متظبط - ثبّت' : '✓ Base aligned - hold still'),
    capturing: captureStage === 'neck'
      ? (lang === 'ar' ? '📸 تصوير العنق...' : '📸 Capturing neck...')
      : (lang === 'ar' ? '📸 تصوير القاع...' : '📸 Capturing base...'),
  };

  // Quality badge color
  const qBg = (val: number, threshold: number) =>
    val >= threshold ? 'bg-green-500/80' : val >= threshold * 0.7 ? 'bg-yellow-500/80' : 'bg-red-500/80';

  return (
    <div className="max-w-md mx-auto">
      <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl">
        {/* Video */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Dark overlay outside frame */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 133"
          preserveAspectRatio="none"
        >
          <defs>
            <mask id="frameMask">
              <rect width="100" height="133" fill="white" />
              <path d={getBottlePath()} fill="black" fillRule="evenodd" />
            </mask>
          </defs>
          <rect width="100" height="133" fill="rgba(0,0,0,0.55)" mask="url(#frameMask)" />
        </svg>

        {/* Bottle frame outline + measurement rulers */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 133"
          preserveAspectRatio="none"
        >
          <motion.path
            d={getBottlePath()}
            fill="none"
            fillRule="evenodd"
            stroke={frameColor}
            strokeWidth={alignState === 'aligned' || alignState === 'capturing' ? 1.4 : 0.8}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={alignState === 'aligned' || alignState === 'capturing' ? '0' : '2 1.5'}
            animate={{ stroke: frameColor }}
            transition={{ duration: 0.3 }}
          />
          {(alignState === 'aligned' || alignState === 'capturing') && (
            <>
              <circle cx="42" cy="7" r="1.5" fill={frameColor} />
              <circle cx="42" cy="123" r="1.5" fill={frameColor} />
            </>
          )}

          {/* Stage indicator: highlight neck (top) or base (bottom) */}
          {captureStage === 'neck' && (
            <g>
              {/* Band at the cap/neck area (y=7 to y=17) */}
              <rect
                x="27" y="7"
                width="30" height="10"
                fill="rgba(34, 197, 94, 0.15)"
                stroke="#22c55e"
                strokeWidth="0.6"
                strokeDasharray="2 1"
              />
              <text
                x="42" y="5"
                fontSize="3.5"
                fill="#22c55e"
                textAnchor="middle"
                fontWeight="bold"
                style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 0.5 }}
              >
                {lang === 'ar' ? 'العنق ↑' : 'NECK ↑'}
              </text>
            </g>
          )}
          {captureStage === 'base' && (
            <g>
              {/* Band at the base area (y=113 to y=123) */}
              <rect
                x="12" y="113"
                width="60" height="10"
                fill="rgba(34, 197, 94, 0.15)"
                stroke="#22c55e"
                strokeWidth="0.6"
                strokeDasharray="2 1"
              />
              <text
                x="42" y="131"
                fontSize="3.5"
                fill="#22c55e"
                textAnchor="middle"
                fontWeight="bold"
                style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 0.5 }}
              >
                {lang === 'ar' ? 'القاع ↓' : 'BASE ↓'}
              </text>
            </g>
          )}

          {/* LEFT RULER: percentage marks (0%, 25%, 50%, 75%, 100%) */}
          {/* Volume range: y=30 (top, 100%) → y=122 (bottom, 0%) */}
          {[
            { pct: 100, y: VOLUME_TOP_Y },
            { pct: 75, y: VOLUME_TOP_Y + (VOLUME_BOTTOM_Y - VOLUME_TOP_Y) * 0.25 },
            { pct: 50, y: VOLUME_TOP_Y + (VOLUME_BOTTOM_Y - VOLUME_TOP_Y) * 0.50 },
            { pct: 25, y: VOLUME_TOP_Y + (VOLUME_BOTTOM_Y - VOLUME_TOP_Y) * 0.75 },
            { pct: 0, y: VOLUME_BOTTOM_Y },
          ].map(({ pct, y }) => (
            <g key={`pct-${pct}`}>
              <line
                x1="6" y1={y}
                x2="12" y2={y}
                stroke="#ffffff"
                strokeWidth="0.5"
                strokeOpacity="0.9"
              />
              <text
                x="5" y={y + 1.2}
                fontSize="3"
                fill="#ffffff"
                fillOpacity="0.95"
                textAnchor="end"
                fontWeight="bold"
                style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 0.4 }}
              >
                {pct}%
              </text>
            </g>
          ))}

          {/* RIGHT RULER: liter marks (1.5L, 1.0L, 0.5L, 0L) */}
          {/* Volume range: y=30 (top, 1.5L) → y=122 (bottom, 0L) */}
          {[
            { l: '1.5L', y: VOLUME_TOP_Y },
            { l: '1.0L', y: VOLUME_TOP_Y + (VOLUME_BOTTOM_Y - VOLUME_TOP_Y) * (1 / 3) },
            { l: '0.5L', y: VOLUME_TOP_Y + (VOLUME_BOTTOM_Y - VOLUME_TOP_Y) * (2 / 3) },
            { l: '0L', y: VOLUME_BOTTOM_Y },
          ].map(({ l, y }) => (
            <g key={`l-${l}`}>
              <line
                x1="88" y1={y}
                x2="94" y2={y}
                stroke="#ffd76b"
                strokeWidth="0.5"
                strokeOpacity="0.9"
              />
              <text
                x="95" y={y + 1.2}
                fontSize="3"
                fill="#ffd76b"
                fillOpacity="0.95"
                textAnchor="start"
                fontWeight="bold"
                style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 0.4 }}
              >
                {l}
              </text>
            </g>
          ))}
        </svg>

        {/* Status badge - top */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            animate={{
              backgroundColor: frameColor,
              scale: alignState === 'aligned' ? [1, 1.05, 1] : 1,
            }}
            transition={{
              backgroundColor: { duration: 0.3 },
              scale: { duration: 0.6, repeat: Infinity },
            }}
            className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-lg whitespace-nowrap"
          >
            {statusText[alignState]}
          </motion.div>
        </div>

        {/* Quality indicators - top right */}
        <div className="absolute top-14 right-3 flex flex-col gap-1.5 z-10">
          <QualityChip
            icon="🔆"
            value={quality.brightness}
            threshold={MIN_BRIGHTNESS}
            label={lang === 'ar' ? 'الإضاءة' : 'Light'}
            bgClass={qBg(quality.brightness, MIN_BRIGHTNESS)}
          />
          <QualityChip
            icon="🎯"
            value={quality.sharpness}
            threshold={MIN_SHARPNESS}
            label={lang === 'ar' ? 'الوضوح' : 'Focus'}
            bgClass={qBg(quality.sharpness, MIN_SHARPNESS)}
          />
          <QualityChip
            icon="✋"
            value={quality.motion}
            threshold={MIN_MOTION_STABILITY}
            label={lang === 'ar' ? 'الثبات' : 'Steady'}
            bgClass={qBg(quality.motion, MIN_MOTION_STABILITY)}
          />
          <QualityChip
            icon="📐"
            value={quality.tilt}
            threshold={MIN_TILT_OK}
            label={lang === 'ar' ? 'الميل' : 'Tilt'}
            bgClass={qBg(quality.tilt, MIN_TILT_OK)}
          />
        </div>

        {/* Warnings list - middle bottom */}
        {warnings.length > 0 && alignState !== 'capturing' && (
          <div className="absolute top-14 left-3 max-w-[55%] flex flex-col gap-1 z-10">
            <AnimatePresence mode="popLayout">
              {warnings.slice(0, 3).map((w) => (
                <motion.div
                  key={w}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md"
                >
                  {w}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Countdown circle - center when nearly done */}
        {countdown > 0 && alignState === 'aligned' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/30 backdrop-blur-md flex items-center justify-center border-4 border-green-400">
              <span className="text-white text-3xl font-bold">{countdown}</span>
            </div>
          </motion.div>
        )}

        {/* Score bar - bottom */}
        <div className="absolute bottom-20 left-4 right-4 z-10">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full"
              animate={{
                width: `${Math.round(score * 100)}%`,
                backgroundColor: frameColor,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-white/80 text-[10px] text-center mt-1">
            {lang === 'ar'
              ? `دقة المحاذاة: ${Math.round(score * 100)}%`
              : `Alignment: ${Math.round(score * 100)}%`}
          </p>
        </div>

        {/* Controls - bottom */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 z-10">
          {/* Manual capture - large center button */}
          <button
            onClick={captureFrame}
            disabled={captured || alignState === 'searching'}
            className="relative bg-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <motion.div
              animate={{
                backgroundColor: frameColor,
                scale: alignState === 'aligned' ? [1, 0.9, 1] : 1,
              }}
              transition={{
                backgroundColor: { duration: 0.3 },
                scale: { duration: 0.8, repeat: Infinity },
              }}
              className="w-12 h-12 rounded-full"
            />
          </button>

          {/* Auto-capture toggle */}
          <button
            onClick={() => setAutoCapture(!autoCapture)}
            className={`backdrop-blur-md text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              autoCapture ? 'bg-green-500/60' : 'bg-white/20'
            }`}
            title={lang === 'ar' ? 'تصوير تلقائي' : 'Auto-capture'}
          >
            <span className="text-[10px] font-bold">{autoCapture ? 'AUTO' : 'OFF'}</span>
          </button>
        </div>

        {/* Camera error */}
        <AnimatePresence>
          {cameraError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-20"
            >
              <span className="text-4xl mb-3">📷</span>
              <p className="text-white text-sm mb-2">
                {lang === 'ar' ? 'لا يمكن الوصول إلى الكاميرا' : 'Cannot access camera'}
              </p>
              <p className="text-white/60 text-xs mb-4">{cameraError}</p>
              <button
                onClick={startCamera}
                className="bg-gold-gradient text-white px-6 py-2 rounded-xl text-sm font-medium"
              >
                {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions below */}
      <div className="mt-4 glass-card rounded-xl p-3 text-center">
        <p className="text-gold-600 text-xs leading-relaxed">
          {lang === 'ar'
            ? '💡 ضع زجاجة عافية 1.5 لتر داخل الإطار. ثبّت الكاميرا وانتظر حتى تصبح كل المؤشرات خضراء.'
            : '💡 Place the Afia 1.5L bottle inside the frame. Hold steady until all indicators turn green.'}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Quality indicator chip
// ============================================================
function QualityChip({
  icon, value, label, bgClass,
}: {
  icon: string;
  value: number;
  threshold: number;
  label: string;
  bgClass: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm shadow-md ${bgClass}`}
    >
      <span className="text-[10px]">{icon}</span>
      <div className="flex-1">
        <div className="text-white text-[9px] font-bold leading-none">{label}</div>
        <div className="h-0.5 bg-white/30 rounded-full mt-0.5 overflow-hidden w-10">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.round(value * 100)}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SVG path for the Afia 1.5L bottle — traced from ENGINEERING DRAWING
//
// Actual dimensions (mm):
//   Total height:   301 ± 1.2
//   Cap diameter:   Ø 37.3 ± 0.5   (38mm neck finish, threaded)
//   Cap thread h:   16.5
//   R4 ring flare:  ~4 (neck collar)
//   Straight neck:  5.5
//   Shoulder ref:   52.5 (width at mid-shoulder)
//   Body width:     70
//   Base width:     78.1
//   Base rim:       16
//   Handle:         integrated on the right side
//
// Mapped to viewBox 100 × 133 (centered at x=42 for body):
//   Cap / neck width  → 28 units (x 28..56)  — 37.3 / 78.1
//   Body width        → 56 units (x 14..70)  — ~70 / 78.1 (body straight walls)
//   Base width        → 60 units (x 12..72)  — 78.1 / 78.1 (slight flare)
//   Handle outer ext  → x=80 (10 units beyond body right at x=70)
//
// Vertical segments (y):
//   7..12  cap / thread section (16.5mm)
//   12..15 R4 ring flare (neck collar)
//   15..17 short straight neck (5.5mm)
//   17..31 shoulder transition (distinctive straight diagonal lines on both sides)
//   31..113 main body (straight walls)
//   113..123 base (slight outward flare with rounded corners)
//
// Handle on right:
//   37..70 outer extent (x=80)
//   43..63 inner grip hole (x=72..78)
//
// Fill-level mark (1500 cc) ≈ y 22 (just below shoulder top)
// Bounds: x 12..80, y 7..123
// ============================================================
function getBottlePath(): string {
  return `
    M 30 7
    L 54 7
    Q 56 7 56 9
    L 56 12
    Q 57 12 57 13.5
    Q 57 15 56 15
    L 56 17
    Q 58 19 60 22
    L 67 31
    Q 70 34 70 37
    Q 76 37 80 43
    L 80 61
    Q 80 67 76 69
    Q 72 70 70 70
    L 70 113
    Q 72 113 72 115
    L 72 119
    Q 72 123 68 123
    L 16 123
    Q 12 123 12 119
    L 12 115
    Q 12 113 14 113
    L 14 37
    Q 14 34 16 32
    L 25 22
    Q 27 19 28 17
    L 28 15
    Q 27 15 27 13.5
    Q 27 12 28 12
    L 28 9
    Q 28 7 30 7
    Z
    M 73 43
    Q 72 43 72 44
    L 72 62
    Q 72 63 73 63
    L 77 63
    Q 78 63 78 62
    L 78 44
    Q 78 43 77 43
    Z
  `;
}
