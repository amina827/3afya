'use client';

import { useState, useCallback } from 'react';
import { OilResult, Product } from '@/types';
import { analyzeBottleImage, getBottleId, ScanResult, BottleBBox } from '@/services/api';

interface UseOilDetectionReturn {
  analyzing: boolean;
  result: OilResult | null;
  imageUrl: string | null;
  processedImageUrl: string | null;
  originalImageUrl: string | null;
  bottleBbox: BottleBBox | null;
  confidence: number | null;
  scanId: string | null;
  error: string | null;
  analyze: (files: File | File[], product?: Product) => void;
  reset: () => void;
}

function backendToOilResult(scan: ScanResult, product: Product): OilResult {
  const level = Math.round(scan.oil_ratio * 100);
  const remainingMl = Math.round(scan.remaining_volume_liters * 1000);
  const consumedMl = Math.round(scan.consumed_volume_liters * 1000);
  const dailyUsage = 30; // avg ml per day
  const daysRemaining = Math.max(1, Math.round(remainingMl / dailyUsage));

  return {
    level,
    remainingMl,
    consumedMl,
    remainingLiters: Math.round(scan.remaining_volume_liters * 100) / 100,
    consumedLiters: Math.round(scan.consumed_volume_liters * 100) / 100,
    remainingCups: Math.round(scan.remaining_cups * 10) / 10,
    consumedCups: Math.round(scan.consumed_cups * 10) / 10,
    daysRemaining,
    nutrition: {
      calories: Math.round(remainingMl * product.caloriesPerMl),
      totalFat: Math.round(remainingMl * product.fatPerMl),
      saturatedFat: Math.round(remainingMl * product.fatPerMl * 0.15),
      vitaminE: Math.round(remainingMl * product.vitaminEPerMl * 10) / 10,
    },
  };
}

export function useOilDetection(): UseOilDetectionReturn {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<OilResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [bottleBbox, setBottleBbox] = useState<BottleBBox | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (filesInput: File | File[], product?: Product) => {
    const files = Array.isArray(filesInput) ? filesInput : [filesInput];
    if (files.length === 0) return;

    setAnalyzing(true);
    setResult(null);
    setError(null);
    setProcessedImageUrl(null);
    setOriginalImageUrl(null);
    setBottleBbox(null);
    setConfidence(null);
    setScanId(null);

    // Show the first file as preview
    const url = URL.createObjectURL(files[0]);
    setImageUrl(url);

    try {
      const { products } = await import('@/data/products');
      const selectedProduct = product || products[0];
      const bottleId = getBottleId(selectedProduct.id);

      // Send all files in parallel
      const settled = await Promise.allSettled(
        files.map((f) => analyzeBottleImage(bottleId, f)),
      );
      const successful = settled
        .filter((r): r is PromiseFulfilledResult<{ scanId: string; result: ScanResult }> => r.status === 'fulfilled')
        .map((r) => r.value);

      if (successful.length === 0) {
        const firstErr = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        throw new Error(firstErr ? String(firstErr.reason) : 'All analyses failed');
      }

      // ----- AGGREGATION: trimmed mean + confidence weighting -----
      // Step 1: sort by oil_ratio
      const sorted = [...successful].sort(
        (a, b) => a.result.oil_ratio - b.result.oil_ratio,
      );

      // Step 2: trim outliers - drop top and bottom if we have >= 4 samples
      let trimmed = sorted;
      if (sorted.length >= 4) {
        trimmed = sorted.slice(1, -1);
      }

      // Step 3: confidence-weighted average of remaining
      const totalWeight = trimmed.reduce((s, r) => s + r.result.confidence_score, 0);
      const weightedRatio = totalWeight > 0
        ? trimmed.reduce((s, r) => s + r.result.oil_ratio * r.result.confidence_score, 0) / totalWeight
        : trimmed.reduce((s, r) => s + r.result.oil_ratio, 0) / trimmed.length;
      const avgConfidence = trimmed.reduce((s, r) => s + r.result.confidence_score, 0) / trimmed.length;

      // Step 4: pick the result closest to the weighted average as primary
      const primary = successful.reduce((best, curr) => {
        const bestDiff = Math.abs(best.result.oil_ratio - weightedRatio);
        const currDiff = Math.abs(curr.result.oil_ratio - weightedRatio);
        return currDiff < bestDiff ? curr : best;
      });

      // Build the final scan result with aggregated values
      const total = primary.result.remaining_volume_liters + primary.result.consumed_volume_liters;
      const finalRemaining = total * weightedRatio;
      const finalConsumed = total - finalRemaining;
      const finalScan: ScanResult = {
        ...primary.result,
        oil_ratio: weightedRatio,
        remaining_volume_liters: finalRemaining,
        consumed_volume_liters: finalConsumed,
        remaining_cups: finalRemaining / 0.2,
        consumed_cups: finalConsumed / 0.2,
        confidence_score: avgConfidence,
      };

      // eslint-disable-next-line no-console
      console.log('[OilDetection] samples:', successful.map((s) => ({
        ratio: Math.round(s.result.oil_ratio * 100),
        conf: Math.round(s.result.confidence_score * 100),
      })));
      // eslint-disable-next-line no-console
      console.log('[OilDetection] final:', Math.round(weightedRatio * 100), '%');

      setScanId(primary.scanId);
      setConfidence(avgConfidence);
      setProcessedImageUrl(primary.result.processed_image_url);
      setOriginalImageUrl(primary.result.original_image_url);
      setBottleBbox(primary.result.bottle_bbox);
      setResult(backendToOilResult(finalScan, selectedProduct));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalyzing(false);
    setResult(null);
    setError(null);
    setConfidence(null);
    setProcessedImageUrl(null);
    setOriginalImageUrl(null);
    setBottleBbox(null);
    setScanId(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
  }, [imageUrl]);

  return {
    analyzing, result, imageUrl, processedImageUrl, originalImageUrl,
    bottleBbox, confidence, scanId, error, analyze, reset,
  };
}
