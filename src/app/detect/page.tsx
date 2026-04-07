'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { useOilDetection } from '@/hooks/useOilDetection';
import { ImageUploader } from '@/components/detection/ImageUploader';
import { OilAnalyzer } from '@/components/detection/OilAnalyzer';
import { ResultsDisplay } from '@/components/detection/ResultsDisplay';
import { getProductById } from '@/data/products';

function DetectContent() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const productId = searchParams.get('product');
  const product = productId ? getProductById(productId) : undefined;
  const { analyzing, result, imageUrl, processedImageUrl, confidence, error, analyze, reset } = useOilDetection();

  const handleImageSelected = (file: File) => {
    analyze(file, product || undefined);
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
          {product && (
            <p className="text-gold-600/60 text-sm">
              {lang === 'ar' ? product.nameAr : product.nameEn} ({product.volume}ml)
            </p>
          )}
        </motion.div>

        {!imageUrl && !result && (
          <ImageUploader onImageSelected={handleImageSelected} />
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
            {/* Processed image from backend */}
            {processedImageUrl && (
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
                        {lang === 'ar' ? 'دقة التحليل' : 'Confidence'}:{' '}
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            <ResultsDisplay result={result} onReset={reset} />
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
