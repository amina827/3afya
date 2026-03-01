'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { QRScanner } from '@/components/scanner/QRScanner';
import { ScannerFallback } from '@/components/scanner/ScannerFallback';
import { ProductCard } from '@/components/scanner/ProductCard';
import { getProductByQR } from '@/data/products';
import { Product } from '@/types';

export default function ScanPage() {
  const { t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [cameraFailed, setCameraFailed] = useState(false);

  const handleScan = useCallback((result: string) => {
    const product = getProductByQR(result);
    if (product) {
      setSelectedProduct(product);
      setShowScanner(false);
    }
  }, []);

  const handleCameraError = useCallback(() => {
    setCameraFailed(true);
    setShowScanner(false);
  }, []);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedProduct(null);
    setCameraFailed(true);
    setShowScanner(false);
  }, []);

  return (
    <div className="min-h-screen bg-green-gradient py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-shimmer text-3xl font-bold mb-2">
            {t('scanner.title')}
          </h1>
          <div className="gold-divider max-w-[60px] mx-auto mb-3" />
          <p className="text-gold-600/60 text-sm">
            {t('scanner.instruction')}
          </p>
        </motion.div>

        {selectedProduct ? (
          <ProductCard product={selectedProduct} onReset={handleReset} />
        ) : (
          <>
            {showScanner && !cameraFailed && (
              <div className="glass-card rounded-2xl p-4 max-w-sm mx-auto">
                <QRScanner onScan={handleScan} onError={handleCameraError} />
              </div>
            )}

            {cameraFailed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mb-6"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-200 text-gold-700 text-sm">
                  <span>⚠️</span> {t('scanner.cameraError')}
                </div>
              </motion.div>
            )}

            <ScannerFallback onSelectProduct={handleSelectProduct} />
          </>
        )}
      </div>
    </div>
  );
}
