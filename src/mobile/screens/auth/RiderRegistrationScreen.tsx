import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useMobileApp } from '../../context/MobileAppContext';
import { authService } from '../../services/api';
import { updateStoredUser } from '../../services/sessionStorage';

export function RiderRegistrationScreen() {
  const { setStep, phone, applyCurrentUser, profileFields, setProfileFields } = useMobileApp();
  const [submitting, setSubmitting] = useState(false);

  return (
    <motion.div
      key="rider-register"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex h-full min-h-0 flex-col bg-white velox-safe-t velox-safe-x"
    >
      <button
        type="button"
        onClick={() => setStep('otp')}
        className="mt-3 shrink-0 self-start rounded-full bg-slate-100 p-2.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-200"
        aria-label="Back"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <h2 className="text-2xl font-bold text-slate-900">Complete rider registration</h2>
          <p className="mt-2 text-sm text-slate-500">New rider account for +251 {phone}</p>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={profileFields.firstName}
                onChange={(e) => setProfileFields((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="First name"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-900 outline-none transition-all focus:border-velox-primary focus:ring-4 focus:ring-velox-primary/15"
              />
              <input
                type="text"
                value={profileFields.lastName}
                onChange={(e) => setProfileFields((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="Last name"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-900 outline-none transition-all focus:border-velox-primary focus:ring-4 focus:ring-velox-primary/15"
              />
            </div>
            <input
              type="email"
              value={profileFields.email}
              onChange={(e) => setProfileFields((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-900 outline-none transition-all focus:border-velox-primary focus:ring-4 focus:ring-velox-primary/15"
            />
            <input
              type="text"
              value={profileFields.address}
              onChange={(e) => setProfileFields((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Address"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-900 outline-none transition-all focus:border-velox-primary focus:ring-4 focus:ring-velox-primary/15"
            />
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Verified phone
              </label>
              <input
                type="text"
                value={`+251 ${phone}`}
                readOnly
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4 text-base font-bold text-slate-600 outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={
              submitting ||
              !profileFields.firstName.trim() ||
              !profileFields.lastName.trim() ||
              !profileFields.email.trim() ||
              !profileFields.address.trim()
            }
            onClick={async () => {
              setSubmitting(true);
              try {
                const res = await authService.registerRider({
                  firstName: profileFields.firstName.trim(),
                  lastName: profileFields.lastName.trim(),
                  email: profileFields.email.trim(),
                  address: profileFields.address.trim(),
                });
                updateStoredUser(res.user);
                applyCurrentUser(res.user);
                setStep('home');
              } finally {
                setSubmitting(false);
              }
            }}
            className="mt-6 w-full rounded-2xl bg-velox-primary py-4 text-lg font-bold text-white shadow-[0_12px_28px_rgba(75,44,109,0.35)] disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Continue'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
