import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useMobileApp } from '../../context/MobileAppContext';
import { authService } from '../../services/api';

export function PhoneScreen() {
  const { t, handleNextStep, setStep, phone, setPhone, mode } = useMobileApp();
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
        className="mt-3 shrink-0 self-start rounded-full bg-slate-100 p-2.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-200"
        aria-label="Back"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>

      <div className="flex min-h-0 flex-1 flex-col justify-center pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex w-full max-w-sm flex-col">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('phoneAuth')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('enterPhone')}</p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Mobile Number
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-4 shadow-sm transition-all focus-within:border-velox-primary focus-within:ring-4 focus-within:ring-velox-primary/15">
              <span className="shrink-0 text-lg font-black text-slate-700">+251</span>
              <input
                type="tel"
                placeholder="911 223 344"
                className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-wide text-slate-900 outline-none placeholder:text-slate-300"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={async () => {
                if (isSubmitting || phone.length < 9) return;
                setIsSubmitting(true);
                try {
                  await authService.loginWithPhone(phone, mode);
                  handleNextStep();
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={phone.length < 9 || isSubmitting}
              className="w-full rounded-2xl bg-velox-primary py-4 text-lg font-bold text-white shadow-[0_12px_28px_rgba(75,44,109,0.35)] transition-all hover:bg-velox-dark disabled:opacity-50"
            >
              {t('sendOtp')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
