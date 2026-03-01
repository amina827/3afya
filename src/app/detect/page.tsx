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
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const productId = searchParams.get('product');
  const product = productId ? getProductById(productId) : undefined;
  const { analyzing, result, imageUrl, analyze, reset } = useOilDetection();

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
              {product.nameEn} ({product.volume}ml)
            </p>
          )}
        </motion.div>

        {!imageUrl && !result && (
          <ImageUploader onImageSelected={handleImageSelected} />
        )}

        {imageUrl && (analyzing || !result) && (
          <OilAnalyzer imageUrl={imageUrl} analyzing={analyzing} />
        )}

        {result && (
          <ResultsDisplay result={result} onReset={reset} />
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
