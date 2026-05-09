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
  // Use backend values directly — no frontend recalculations
  const level = Math.round(scan.oil_percentage);
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

      // Send only the best image (first file)
      const { scanId: resultScanId, result: scanResult } = await analyzeBottleImage(bottleId, files[0]);

      // eslint-disable-next-line no-console
      console.log('[OilDetection] backend result:', scanResult.oil_percentage, '%');

      setScanId(resultScanId);
      setConfidence(scanResult.confidence_score);
      setProcessedImageUrl(scanResult.processed_image_url);
      setOriginalImageUrl(scanResult.original_image_url);
      setBottleBbox(scanResult.bottle_bbox);
      setResult(backendToOilResult(scanResult, selectedProduct));
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
