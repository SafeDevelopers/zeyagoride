import { motion } from 'motion/react';
import { Car, User } from 'lucide-react';
import { useMobileApp } from '../../context/MobileAppContext';

export function WelcomeScreen() {
  const { t, setMode, handleNextStep } = useMobileApp();
  return (
      <motion.div 
        key="welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex h-full min-h-0 flex-col items-center justify-center bg-white velox-mobile-menu-pad pt-[max(2.5rem,env(safe-area-inset-top,0px))] text-center pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]"
      >
        <div className="mb-12 w-full max-w-md">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-velox-primary text-white shadow-xl shadow-[0_12px_40px_rgba(75,44,109,0.35)]">
            <Car className="h-10 w-10" strokeWidth={2} />
          </div>
          <h1 className="mb-2 text-4xl font-bold italic tracking-tight text-slate-900">{t('welcome')}</h1>
          <p className="font-medium text-slate-500">Fast, reliable rides in Ethiopia.</p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <button 
            type="button"
            onClick={() => { setMode('rider'); handleNextStep(); }}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-velox-primary py-4 text-lg font-bold text-white shadow-lg shadow-[0_8px_28px_rgba(75,44,109,0.35)] transition-all active:scale-[0.98] hover:bg-velox-dark"
          >
            <User className="h-5 w-5 shrink-0" />
            {t('continueRider')}
          </button>
          <button 
            type="button"
            onClick={() => { setMode('driver'); handleNextStep(); }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-velox-primary bg-white py-4 text-lg font-bold text-velox-primary shadow-sm transition-all active:scale-[0.98] hover:bg-velox-bg"
          >
            <Car className="h-5 w-5 shrink-0" />
            {t('continueDriver')}
          </button>
        </div>
      </motion.div>
  );
}
