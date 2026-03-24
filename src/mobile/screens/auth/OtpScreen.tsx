import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useMobileApp } from '../../context/MobileAppContext';
import { authService } from '../../services/api';
import { persistSessionAfterVerify } from '../../services/sessionStorage';

export function OtpScreen() {
  const { t, handleNextStep, setStep, phone, otp, setOtp, isVerifying, setIsVerifying, resendCooldown, handleResendOtp } = useMobileApp();
  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex h-full min-h-0 flex-col bg-white velox-safe-t velox-safe-x"
    >
      <button
        type="button"
        onClick={() => setStep('phone')}
        className="mb-6 mt-3 shrink-0 self-start text-slate-700 transition-opacity hover:opacity-70"
        aria-label="Back"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>

      <div className="shrink-0">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">{t('verifyOtp')}</h2>
        <p className="text-slate-500">Enter the 4-digit code sent to +251 {phone}</p>
      </div>

      <div className="mt-8 shrink-0">
        <div className="flex w-full flex-nowrap items-center justify-center gap-2 sm:gap-3">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otp[i]}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                const newOtp = [...otp];
                newOtp[i] = val.slice(-1) || '';
                setOtp(newOtp);
                if (val && i < 3) document.getElementById(`otp-${i + 1}`)?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !otp[i] && i > 0) {
                  document.getElementById(`otp-${i - 1}`)?.focus();
                }
              }}
              className="box-border h-14 w-[4.25rem] max-w-[min(4.25rem,22%)] shrink-0 rounded-xl border-2 border-slate-200 bg-white text-center text-2xl font-bold text-slate-900 shadow-sm outline-none transition-colors focus:border-velox-primary focus:ring-2 focus:ring-velox-primary/20"
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1" aria-hidden />

      <div className="shrink-0 space-y-4 velox-safe-b pt-2">
        <div className="text-center">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCooldown > 0}
            className={`text-sm font-bold transition-colors ${resendCooldown > 0 ? 'text-slate-400' : 'text-velox-primary hover:text-velox-dark'}`}
          >
            {t('resendOtp')} {resendCooldown > 0 && `(${resendCooldown}s)`}
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            setIsVerifying(true);
            try {
              const res = await authService.verifyOtp(phone, otp.join(''));
              persistSessionAfterVerify(res);
              handleNextStep();
            } finally {
              setIsVerifying(false);
            }
          }}
          disabled={otp.some((v) => !v) || isVerifying}
          className="flex w-full items-center justify-center rounded-xl bg-velox-primary py-4 text-lg font-bold text-white shadow-[0_8px_28px_rgba(75,44,109,0.35)] transition-all hover:bg-velox-dark disabled:opacity-50"
        >
          {isVerifying ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            t('verifyOtp')
          )}
        </button>
      </div>
    </motion.div>
  );
}
