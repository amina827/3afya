'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { useOilDetection } from '@/hooks/useOilDetection';
import { BottleCameraCapture } from '@/components/detection/BottleCameraCapture';
import { OilAnalyzer } from '@/components/detection/OilAnalyzer';
import { ResultsDisplay } from '@/components/detection/ResultsDisplay';
import { AccuracyFeedback } from '@/components/detection/AccuracyFeedback';
import { InteractiveBottleSlider } from '@/components/detection/InteractiveBottleSlider';
import { DEFAULT_PRODUCT } from '@/data/products';
import { submitFeedback } from '@/services/api';

function DetectContent() {
  const { t, lang } = useLanguage();
  // Always use the single 1.5L bottle
  const product = DEFAULT_PRODUCT;
  const {
    analyzing, result, imageUrl, processedImageUrl, originalImageUrl,
    bottleBbox, confidence, scanId, error, analyze, reset,
  } = useOilDetection();
  const [adjustedMl, setAdjustedMl] = useState<number | null>(null);

  const handleImageSelected = (files: File | File[]) => {
    setAdjustedMl(null);
    analyze(files, product);
  };

  const handleConfirmCorrection = async (ml: number) => {
    if (!scanId) return;
    try {
      // Convert ml to cups (200ml per cup)
      const actualCups = ml / 200;
      await submitFeedback(scanId, actualCups, `Manual correction via slider: ${ml}ml`);
    } catch {
      // silent fail - feedback is optional
    }
  };

  return (
    <div className="min-h-screen bg-green-gradient py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-shimmer text-3xl font-bold mb-2">
            {t('detect.title')}
          </h1>
          <p className="text-gold-600/60 text-sm">
            {lang === 'ar' ? product.nameAr : product.nameEn} ({product.volume}ml)
          </p>
        </motion.div>

        {!imageUrl && !result && (
          <BottleCameraCapture onCapture={handleImageSelected} />
        )}

        {imageUrl && (analyzing || (!result && !error)) && (
          <OilAnalyzer imageUrl={imageUrl} analyzing={analyzing} />
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mt-6"
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-600 text-lg mb-2">
                {lang === 'ar' ? 'حدث خطأ' : 'Error'}
              </p>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button
                onClick={reset}
                className="bg-red-500 text-white px-6 py-2 rounded-xl text-sm font-medium"
              >
                {lang === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
              </button>
            </div>
          </motion.div>
        )}

        {result && (
          <>
            {/* Interactive bottle slider on the user's actual photo */}
            {originalImageUrl && bottleBbox && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto mb-4"
              >
                <InteractiveBottleSlider
                  imageUrl={originalImageUrl}
                  bottleBbox={bottleBbox}
                  initialMl={Math.round(result.remainingLiters * 1000)}
                  totalMl={1500}
                  cupMl={200}
                  stepMl={100}
                  onChange={setAdjustedMl}
                  onConfirm={handleConfirmCorrection}
                />
                {confidence !== null && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        confidence >= 0.75
                          ? 'bg-green-500'
                          : confidence >= 0.55
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-gold-600 text-xs">
                      {lang === 'ar' ? 'دقة الكشف' : 'Detection confidence'}:{' '}
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Fallback: show processed image if bbox not available */}
            {(!originalImageUrl || !bottleBbox) && processedImageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto mb-4"
              >
                <div className="glass-card rounded-2xl p-3 overflow-hidden">
                  <img
                    src={processedImageUrl}
                    alt="Processed scan"
                    className="w-full rounded-xl"
                  />
                </div>
              </motion.div>
            )}

            <ResultsDisplay result={result} onReset={reset} />
            {scanId && <AccuracyFeedback scanId={scanId} />}
            {/* Suppress unused warnings - adjustedMl is exposed for future features */}
            {adjustedMl !== null ? <span className="hidden">{adjustedMl}</span> : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function DetectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-green-gradient flex items-center justify-center">
        <div className="text-gold-600 animate-pulse">Loading...</div>
      </div>
    }>
      <DetectContent />
    </Suspense>
  );
}
