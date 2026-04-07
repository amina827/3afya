'use client';

import { useState, useCallback } from 'react';
import { OilResult, Product } from '@/types';
import { analyzeBottleImage, getBottleId, ScanResult } from '@/services/api';

interface UseOilDetectionReturn {
  analyzing: boolean;
  result: OilResult | null;
  imageUrl: string | null;
  processedImageUrl: string | null;
  confidence: number | null;
  scanId: string | null;
  error: string | null;
  analyze: (file: File, product?: Product) => void;
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
  const [confidence, setConfidence] = useState<number | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (file: File, product?: Product) => {
    setAnalyzing(true);
    setResult(null);
    setError(null);
    setProcessedImageUrl(null);
    setConfidence(null);
    setScanId(null);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    try {
      const { products } = await import('@/data/products');
      const selectedProduct = product || products[0];
      const bottleId = getBottleId(selectedProduct.id);

      const { scanId: id, result: scanResult } = await analyzeBottleImage(bottleId, file);

      setScanId(id);
      setConfidence(scanResult.confidence_score);
      setProcessedImageUrl(scanResult.processed_image_url);
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
    setScanId(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
  }, [imageUrl]);

  return { analyzing, result, imageUrl, processedImageUrl, confidence, scanId, error, analyze, reset };
}
