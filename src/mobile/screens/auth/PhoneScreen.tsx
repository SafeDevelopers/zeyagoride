import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useMobileApp } from '../../context/MobileAppContext';
import { authService } from '../../services/api';

export function PhoneScreen() {
  const { t, handleNextStep, setStep, phone, setPhone } = useMobileApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <motion.div
      key="phone"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex h-full min-h-0 flex-col bg-white velox-safe-t velox-safe-x"
    >
      <button
        type="button"
        onClick={() => setStep('welcome')}
        className="mb-6 mt-3 shrink-0 self-start text-slate-700 transition-opacity hover:opacity-70"
        aria-label="Back"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>

      <div className="shrink-0">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">{t('phoneAuth')}</h2>
        <p className="text-slate-500">{t('enterPhone')}</p>
      </div>

      <div className="mt-6 shrink-0">
        <div className="w-full border-b-2 border-slate-200 pb-3 transition-colors focus-within:border-velox-primary">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-xl font-bold text-slate-400">+251</span>
            <input
              type="tel"
              placeholder="911 223 344"
              className="min-w-0 flex-1 bg-transparent text-xl font-bold text-slate-900 outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      <div className="shrink-0 border-t border-transparent velox-safe-b pt-2">
        <button
          type="button"
          onClick={async () => {
            if (isSubmitting || phone.length < 9) return;
            setIsSubmitting(true);
            try {
              await authService.loginWithPhone(phone);
              handleNextStep();
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={phone.length < 9 || isSubmitting}
          className="w-full rounded-xl bg-velox-primary py-4 text-lg font-bold text-white shadow-[0_8px_28px_rgba(75,44,109,0.35)] transition-all hover:bg-velox-dark disabled:opacity-50"
        >
          {t('sendOtp')}
        </button>
      </div>
    </motion.div>
  );
}
