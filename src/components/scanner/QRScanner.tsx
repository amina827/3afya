'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError: () => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const { t } = useLanguage();
  const scannerRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrCodeRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function initScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = scanner;
        setScanning(true);

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {}
        );
      } catch {
        if (mounted) {
          onError();
        }
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, onError]);

  return (
    <div className="relative">
      <div
        id="qr-reader"
        ref={scannerRef}
        className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden"
      />
      {scanning && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-200 text-gold-700 text-sm">
            <span className="w-2 h-2 rounded-full bg-gold-600 animate-pulse" />
            {t('scanner.scanning')}
          </div>
        </div>
      )}
      <p className="mt-4 text-center text-gold-600/60 text-sm">
        {t('scanner.instruction')}
      </p>
    </div>
  );
}
