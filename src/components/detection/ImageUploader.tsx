'use client';

import { useRef, useState, DragEvent } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
}

export function ImageUploader({ onImageSelected }: ImageUploaderProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Drag & Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`glass-card rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-gold-500 bg-gold-100/50'
            : 'hover:border-gold-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex justify-center mb-4">
          <div className="oil-drop" />
        </div>
        <p className="text-gold-700 font-medium mb-2">{t('detect.dragDrop')}</p>
        <p className="text-gold-500 text-sm mb-4">{t('detect.or')}</p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="bg-gold-gradient text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-gold-600/20"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          📂 {t('detect.browse')}
        </motion.button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </motion.div>

      {/* Camera button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => cameraInputRef.current?.click()}
        className="w-full mt-4 glass-card rounded-xl py-3 text-gold-700 font-medium text-sm hover:border-gold-400 transition-all"
      >
        📷 {t('detect.camera')}
      </motion.button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
