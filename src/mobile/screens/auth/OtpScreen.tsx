import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useMobileApp } from '../../context/MobileAppContext';
import { authService } from '../../services/api';
import { persistSessionAfterVerify } from '../../services/sessionStorage';

export function OtpScreen() {
  const { t, setStep, mode, phone, otp, setOtp, isVerifying, setIsVerifying, resendCooldown, handleResendOtp, applyCurrentUser } = useMobileApp();
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
        className="mt-3 shrink-0 self-start rounded-full bg-slate-100 p-2.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-200"
        aria-label="Back"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>

      <div className="flex min-h-0 flex-1 flex-col justify-center pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex w-full max-w-sm flex-col">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('verifyOtp')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Enter the 4-digit code sent to +251 {phone}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-4 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Verification Code
            </p>
            <div className="flex w-full flex-nowrap items-center justify-center gap-2.5 sm:gap-3">
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
                  className="box-border h-16 w-[4.4rem] max-w-[min(4.4rem,22%)] shrink-0 rounded-2xl border-2 border-slate-300 bg-white text-center text-2xl font-black text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.08)] outline-none transition-all focus:border-velox-primary focus:bg-white focus:ring-4 focus:ring-velox-primary/15"
                />
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
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
                  const res = await authService.verifyOtp(phone, otp.join(''), mode);
                  persistSessionAfterVerify(res);
                  applyCurrentUser(res.user);
                  if (res.registrationRequired) {
                    setStep(mode === 'driver' ? 'driver_register' : 'rider_register');
                  } else {
                    setStep('home');
                  }
                } finally {
                  setIsVerifying(false);
                }
              }}
              disabled={otp.some((v) => !v) || isVerifying}
              className="flex w-full items-center justify-center rounded-2xl bg-velox-primary py-4 text-lg font-bold text-white shadow-[0_12px_28px_rgba(75,44,109,0.35)] transition-all hover:bg-velox-dark disabled:opacity-50"
            >
              {isVerifying ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                t('verifyOtp')
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
