'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

interface OilAnalyzerProps {
  imageUrl: string;
  analyzing: boolean;
}

export function OilAnalyzer({ imageUrl, analyzing }: OilAnalyzerProps) {
  const { t } = useLanguage();

  return (
    <div className="max-w-md mx-auto">
      <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
        {/* Image preview */}
        <div className="relative rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Oil bottle"
            className="w-full h-64 object-contain bg-gold-50 rounded-xl"
          />

          {/* Scanning animation overlay */}
          {analyzing && (
            <div className="absolute inset-0 bg-gold-100/60 flex flex-col items-center justify-center">
              {/* Scan line */}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-600 to-transparent"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />

              {/* Corner brackets - golden */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-s-2 border-gold-600" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-e-2 border-gold-600" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-s-2 border-gold-600" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-e-2 border-gold-600" />

              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-center z-10"
              >
                <div className="flex justify-center mb-2">
                  <div className="oil-drop" style={{ width: 36, height: 36 }} />
                </div>
                <p className="text-gold-700 font-medium text-sm">
                  {t('detect.analyzing')}
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
