'use client';

import { useState, useCallback, useRef } from 'react';
import { OilResult, Product } from '@/types';
import { analyzeOilLevel, calculateResults, processImage } from '@/lib/oil-analyzer';
import { products } from '@/data/products';

interface UseOilDetectionReturn {
  analyzing: boolean;
  result: OilResult | null;
  imageUrl: string | null;
  error: string | null;
  analyze: (file: File, product?: Product) => void;
  reset: () => void;
}

export function useOilDetection(): UseOilDetectionReturn {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<OilResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const analyze = useCallback((file: File, product?: Product) => {
    setAnalyzing(true);
    setResult(null);
    setError(null);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      // Simulated AI delay
      setTimeout(() => {
        try {
          if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
          }
          const imageData = processImage(canvasRef.current, img);
          const level = analyzeOilLevel(imageData);
          const selectedProduct = product || products[0];
          const oilResult = calculateResults(
            level,
            selectedProduct.volume,
            selectedProduct.caloriesPerMl,
            selectedProduct.fatPerMl,
            selectedProduct.vitaminEPerMl
          );
          setResult(oilResult);
        } catch {
          setError('Failed to analyze image');
        } finally {
          setAnalyzing(false);
        }
      }, 2500);
    };

    img.onerror = () => {
      setError('Failed to load image');
      setAnalyzing(false);
    };

    img.src = url;
  }, []);

  const reset = useCallback(() => {
    setAnalyzing(false);
    setResult(null);
    setError(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
  }, [imageUrl]);

  return { analyzing, result, imageUrl, error, analyze, reset };
}
