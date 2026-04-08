'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { submitFeedback } from '@/services/api';

interface AccuracyFeedbackProps {
  scanId: string;
}

export function AccuracyFeedback({ scanId }: AccuracyFeedbackProps) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [actualCups, setActualCups] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const cups = parseFloat(actualCups);
    if (isNaN(cups) || cups < 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback(scanId, cups, notes);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-green rounded-xl p-4 mb-4 text-center"
      >
        <p className="text-green-600 font-medium text-sm">
          {t('detect.feedbackSuccess')}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between glass-card rounded-xl p-3 text-sm"
      >
        <span className="text-gold-600 font-medium">
          {t('detect.feedbackToggle')}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="text-gold-500"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-b-xl p-4 -mt-1 border-t border-gold-200/30">
              <p className="text-gold-500 text-xs mb-3">
                {t('detect.feedbackDesc')}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-gold-600 text-xs font-medium block mb-1">
                    {t('detect.actualCups')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={actualCups}
                    onChange={(e) => setActualCups(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: 3.5' : 'e.g. 3.5'}
                    className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2 text-sm text-gold-800 placeholder:text-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-gold-600 text-xs font-medium block mb-1">
                    {t('detect.feedbackNotes')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder={lang === 'ar' ? 'أي ملاحظات عن الإضاءة أو زاوية الصورة...' : 'Any notes about lighting, angle...'}
                    className="w-full bg-white/50 border border-gold-200 rounded-lg px-3 py-2 text-sm text-gold-800 placeholder:text-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !actualCups}
                  className="w-full bg-gold-gradient text-white py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-gold-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? (lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                    : t('detect.submitFeedback')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
