'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { uploadTrainingImage, getTrainingStats, getBottleId } from '@/services/api';
import { products } from '@/data/products';

const LIGHTING_OPTIONS = [
  { value: 'daylight', labelAr: 'ضوء طبيعي', labelEn: 'Natural Daylight' },
  { value: 'fluorescent', labelAr: 'إضاءة داخلية', labelEn: 'Fluorescent/Indoor' },
  { value: 'dim', labelAr: 'إضاءة خافتة', labelEn: 'Dim/Low Light' },
  { value: 'direct_sun', labelAr: 'أشعة شمس مباشرة', labelEn: 'Direct Sunlight' },
  { value: 'mixed', labelAr: 'إضاءة مختلطة', labelEn: 'Mixed Lighting' },
];

const ENV_OPTIONS = [
  { value: 'kitchen', labelAr: 'مطبخ', labelEn: 'Kitchen' },
  { value: 'store', labelAr: 'متجر/رف', labelEn: 'Store/Shelf' },
  { value: 'outdoor', labelAr: 'خارجي', labelEn: 'Outdoor' },
  { value: 'office', labelAr: 'مكتب', labelEn: 'Office' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
];

interface Stats {
  total_images: number;
  verified_images: number;
  by_lighting: Record<string, number>;
  by_environment: Record<string, number>;
}

export default function TrainingPage() {
  const { lang } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState(products[0].id);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [oilPercentage, setOilPercentage] = useState('');
  const [lighting, setLighting] = useState('daylight');
  const [environment, setEnvironment] = useState('kitchen');
  const [notes, setNotes] = useState('');
  const [testerName, setTesterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [uploadCount, setUploadCount] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const data = await getTrainingStats();
      setStats(data);
    } catch {
      // Stats are optional
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, uploadCount]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setSuccess(false);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!image || !oilPercentage) return;
    const pct = parseFloat(oilPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const bottleId = getBottleId(selectedProduct);
      await uploadTrainingImage(bottleId, image, pct, lighting, environment, '', notes, testerName);
      setSuccess(true);
      setUploadCount((c) => c + 1);
      // Reset form
      setImage(null);
      setImagePreview(null);
      setOilPercentage('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-gradient py-8 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-shimmer text-2xl font-bold mb-1">
            {lang === 'ar' ? 'تغذية صور التدريب' : 'Training Image Upload'}
          </h1>
          <p className="text-gold-500 text-sm">
            {lang === 'ar'
              ? 'ارفع صور حقيقية بظروف مختلفة لتحسين دقة الكشف المحلي'
              : 'Upload real images in different conditions to improve local detection accuracy'}
          </p>
        </motion.div>

        {/* Stats Banner */}
        {stats && stats.total_images > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card-green rounded-xl p-4 mb-4"
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-green-700 text-xl font-bold">{stats.total_images}</p>
                <p className="text-green-600 text-[10px]">{lang === 'ar' ? 'إجمالي الصور' : 'Total Images'}</p>
              </div>
              <div>
                <p className="text-green-700 text-xl font-bold">{stats.verified_images}</p>
                <p className="text-green-600 text-[10px]">{lang === 'ar' ? 'تم التحقق' : 'Verified'}</p>
              </div>
              <div>
                <p className="text-green-700 text-xl font-bold">{Object.keys(stats.by_lighting).length}</p>
                <p className="text-green-600 text-[10px]">{lang === 'ar' ? 'أنواع الإضاءة' : 'Lighting Types'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 space-y-4"
        >
          {/* Product */}
          <div>
            <label className="text-gold-600 text-xs font-medium block mb-1">
              {lang === 'ar' ? 'المنتج' : 'Product'}
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2.5 text-sm text-gold-800 focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.image} {lang === 'ar' ? p.nameAr : p.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Image */}
          <div>
            <label className="text-gold-600 text-xs font-medium block mb-1">
              {lang === 'ar' ? 'صورة الزجاجة' : 'Bottle Image'}
            </label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded-lg bg-white/30" />
                <button
                  onClick={() => { setImage(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold"
                >
                  X
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gold-300 rounded-xl cursor-pointer hover:border-gold-500 transition-colors bg-white/20">
                <span className="text-3xl mb-1">📷</span>
                <span className="text-gold-500 text-xs">{lang === 'ar' ? 'اضغط لالتقاط أو اختيار صورة' : 'Tap to capture or select image'}</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Oil Percentage */}
          <div>
            <label className="text-gold-600 text-xs font-medium block mb-1">
              {lang === 'ar' ? 'نسبة الزيت الفعلية (%)' : 'Actual Oil Level (%)'}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={oilPercentage}
              onChange={(e) => setOilPercentage(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: 75' : 'e.g. 75'}
              className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2.5 text-sm text-gold-800 placeholder:text-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400"
              dir="ltr"
            />
          </div>

          {/* Lighting */}
          <div>
            <label className="text-gold-600 text-xs font-medium block mb-1">
              {lang === 'ar' ? 'ظروف الإضاءة' : 'Lighting Conditions'}
            </label>
            <select
              value={lighting}
              onChange={(e) => setLighting(e.target.value)}
              className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2.5 text-sm text-gold-800 focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              {LIGHTING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {lang === 'ar' ? opt.labelAr : opt.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="text-gold-600 text-xs font-medium block mb-1">
              {lang === 'ar' ? 'بيئة التصوير' : 'Environment'}
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2.5 text-sm text-gold-800 focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              {ENV_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {lang === 'ar' ? opt.labelAr : opt.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Tester Name */}
          <div>
            <label className="text-gold-600 text-xs font-medium block mb-1">
              {lang === 'ar' ? 'اسم المختبر' : 'Tester Name'}
            </label>
            <input
              type="text"
              value={testerName}
              onChange={(e) => setTesterName(e.target.value)}
              placeholder={lang === 'ar' ? 'اسمك أو معرفك' : 'Your name or ID'}
              className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2.5 text-sm text-gold-800 placeholder:text-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-gold-600 text-xs font-medium block mb-1">
              {lang === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={lang === 'ar' ? 'أي تفاصيل إضافية عن الصورة...' : 'Any extra details about the image...'}
              className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2.5 text-sm text-gold-800 placeholder:text-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
            />
          </div>

          {/* Error / Success */}
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          {success && (
            <p className="text-green-600 text-xs text-center font-medium">
              {lang === 'ar' ? 'تم رفع الصورة بنجاح! شكراً لمساهمتك.' : 'Image uploaded successfully! Thank you for contributing.'}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !image || !oilPercentage}
            className="w-full bg-gold-gradient text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-gold-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...')
              : (lang === 'ar' ? 'رفع صورة التدريب' : 'Upload Training Image')}
          </button>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-4 mt-4"
        >
          <h3 className="text-gold-700 font-bold text-xs mb-2">
            {lang === 'ar' ? '💡 نصائح للصور الجيدة:' : '💡 Tips for good images:'}
          </h3>
          <ul className="text-gold-500 text-[11px] space-y-1 list-disc list-inside">
            <li>{lang === 'ar' ? 'صوّر الزجاجة كاملة من الأمام' : 'Capture the full bottle from the front'}</li>
            <li>{lang === 'ar' ? 'جرّب إضاءات مختلفة (نهار، ليل، فلورسنت)' : 'Try different lighting (day, night, fluorescent)'}</li>
            <li>{lang === 'ar' ? 'جرّب خلفيات مختلفة (مطبخ، رف، طاولة)' : 'Try different backgrounds (kitchen, shelf, table)'}</li>
            <li>{lang === 'ar' ? 'تأكد من وضوح مستوى الزيت في الصورة' : 'Make sure the oil level is clearly visible'}</li>
            <li>{lang === 'ar' ? 'كل صورة ترفعها تساعد في تحسين الدقة!' : 'Every image you upload helps improve accuracy!'}</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
