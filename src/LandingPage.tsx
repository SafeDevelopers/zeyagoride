import React from 'react';
import { useLanguage } from './LanguageContext';
import {
  Globe,
  Car,
  Shield,
  Zap,
  Smartphone,
  Check,
  ChevronRight,
  Menu,
  X,
  MapPin,
  Navigation,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LandingDemoStatus } from './landing/LandingDemoStatus';

function AppPreviewMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,280px)] sm:max-w-[300px]">
      <div className="absolute -inset-3 rounded-[2.5rem] bg-gradient-to-br from-velox-primary/20 via-velox-accent/10 to-transparent blur-2xl sm:-inset-4" />
      <div className="velox-phone-chrome relative overflow-hidden rounded-[2rem] p-1.5 shadow-[0_20px_64px_rgba(45,27,66,0.32)] ring-1 ring-white/10 sm:rounded-[2.25rem] sm:p-2">
        <div className="overflow-hidden rounded-[1.85rem] bg-velox-bg">
          <div className="flex h-7 items-center justify-center bg-white/90 text-[10px] font-bold text-slate-600">
            9:41
          </div>
          <div className="relative h-[200px] bg-gradient-to-b from-slate-200/80 to-slate-100 sm:h-[220px]">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />
            <div className="absolute bottom-6 left-4 right-4 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lg shadow-[0_8px_32px_rgba(45,27,66,0.12)] backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-800">
                <MapPin size={14} className="text-velox-primary" />
                <span className="truncate">Where to?</span>
              </div>
              <div className="h-2 w-full rounded-full bg-velox-primary/15" />
            </div>
          </div>
          <div className="border-t border-slate-200/80 bg-white px-4 pb-5 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip</span>
              <Navigation size={14} className="text-velox-primary" />
            </div>
            <div className="h-10 rounded-xl bg-velox-primary shadow-[0_8px_24px_rgba(75,44,109,0.25)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { language, setLanguage } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const primaryBtn =
    'inline-flex min-h-[3rem] w-full items-center justify-center rounded-2xl bg-velox-primary px-6 text-base font-bold text-white shadow-[0_8px_28px_rgba(75,44,109,0.32)] ring-1 ring-velox-primary/30 transition-[transform,box-shadow] hover:bg-[#3d2560] hover:shadow-[0_12px_36px_rgba(75,44,109,0.38)] active:scale-[0.99] sm:w-auto sm:px-8 sm:py-[0.9375rem] sm:text-lg';
  const secondaryBtn =
    'inline-flex min-h-[3rem] w-full items-center justify-center rounded-2xl border-2 border-velox-primary/22 bg-white px-6 text-base font-bold text-velox-dark transition-colors hover:border-velox-primary/38 hover:bg-velox-primary/[0.04] active:scale-[0.99] sm:w-auto sm:px-8 sm:py-[0.9375rem] sm:text-lg';

  return (
    <div className="min-h-screen bg-velox-bg font-sans text-slate-900">
      <nav className="fixed top-0 z-50 w-full border-b border-velox-primary/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-velox-primary to-velox-dark text-white shadow-[0_8px_24px_rgba(75,44,109,0.35)]">
              <Car size={22} strokeWidth={2.25} />
            </div>
            <span className="text-xl font-bold tracking-tight text-velox-dark sm:text-2xl">
              Zeyago<span className="text-velox-primary">Ride</span>
            </span>
          </div>

          <div className="hidden items-center gap-2 lg:gap-3 md:flex">
            <Link
              to="/admin"
              className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-velox-primary/5 hover:text-velox-primary"
            >
              Admin
            </Link>
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
              className="flex items-center gap-2 rounded-full border border-velox-primary/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-velox-primary/30 hover:bg-velox-bg"
            >
              <Globe size={16} className="text-velox-primary" />
              {language === 'en' ? 'አማርኛ' : 'English'}
            </button>
            <Link
              to="/app"
              className="inline-flex min-h-[2.75rem] min-w-[7.5rem] items-center justify-center rounded-2xl bg-velox-primary px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(75,44,109,0.28)] ring-1 ring-velox-primary/30 transition-[transform,box-shadow] hover:bg-[#3d2560] active:scale-[0.99]"
            >
              Open app
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="-mr-1 min-h-[44px] min-w-[44px] rounded-xl p-2 text-slate-600 hover:bg-velox-primary/5 md:hidden"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-velox-primary/10 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 md:hidden"
            >
              <div className="flex flex-col gap-2.5">
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl border border-velox-primary/12 py-3.5 text-center text-sm font-semibold text-velox-primary"
                >
                  Admin
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage(language === 'en' ? 'am' : 'en');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-xl border border-velox-primary/15 p-4 text-left font-semibold"
                >
                  <Globe size={20} className="text-velox-primary" />
                  {language === 'en' ? 'Switch to አማርኛ' : 'Switch to English'}
                </button>
                <Link
                  to="/app"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex min-h-[3rem] items-center justify-center rounded-xl bg-velox-primary font-bold text-white shadow-[0_8px_24px_rgba(75,44,109,0.25)]"
                >
                  Open app
                </Link>
                <Link
                  to="/app?role=driver"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-velox-primary/25 font-bold text-velox-dark"
                >
                  Open as driver
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section className="relative overflow-hidden pb-14 pt-[calc(7rem+env(safe-area-inset-top,0px))] sm:pb-20 sm:pt-36 lg:pb-28 lg:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(142,68,173,0.18),transparent)]" />
        <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-velox-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl lg:max-w-[min(100%,36rem)]"
            >
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-velox-accent">Addis Ababa · One app</p>
              <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight text-velox-dark sm:text-5xl lg:text-[3.15rem] lg:leading-[1.12]">
                Rides when you need them.{' '}
                <span className="text-velox-primary">Earn</span> when you’re behind the wheel.
              </h1>
              <p className="mt-6 max-w-prose text-lg leading-relaxed text-slate-600 sm:text-xl">
                One install for riders and drivers: phone sign-in, request a trip, match, and track the ride — plus a
                driver flow for availability, requests, and trip steps.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
                <Link to="/app" className={primaryBtn}>
                  Open app
                </Link>
                <Link to="/app?role=driver" className={secondaryBtn}>
                  Open as driver
                </Link>
              </div>
              <div className="mt-6 max-w-md sm:mt-7">
                <LandingDemoStatus />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="flex justify-center pt-2 lg:justify-end lg:pt-0"
            >
              <AppPreviewMockup />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-y border-velox-primary/[0.07] bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-velox-accent">Inside the app</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-velox-dark sm:text-4xl">
              One product surface for riders and drivers
            </p>
            <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              OTP sign-in, map-first home, ride request and matching, driver availability, trip phases, wallet, and
              history — backed by the same Nest API the mobile client uses when connected.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: 'Safety-first flow',
                desc: 'Trip status, driver handoff, and in-ride tools designed around a clear ride lifecycle.',
              },
              {
                icon: Zap,
                title: 'Fast to book',
                desc: 'Set pickup and destination, choose a vehicle, and request a ride — matching runs when the backend is available.',
              },
              {
                icon: Smartphone,
                title: 'Rider & driver together',
                desc: 'Switch rider or driver mode from one install — no duplicate apps to maintain.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="rounded-3xl border border-velox-primary/10 bg-velox-bg/90 p-6 shadow-[0_6px_28px_rgba(45,27,66,0.06)] transition-shadow hover:shadow-[0_10px_36px_rgba(45,27,66,0.09)] sm:p-7"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-velox-primary/10 text-velox-primary sm:mb-5 sm:h-12 sm:w-12">
                  <feature.icon size={24} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-velox-dark">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:gap-16 xl:gap-20">
            <motion.div initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-velox-accent">For drivers</h2>
              <p className="mt-3 text-3xl font-bold tracking-tight text-velox-dark sm:text-4xl">
                Go online, accept trips, complete rides
              </p>
              <p className="mt-5 max-w-prose text-lg leading-relaxed text-slate-600">
                Availability, incoming requests, trip steps, and earnings views share the same ride service as the rider
                app whenever the API is running.
              </p>
              <ul className="mt-8 space-y-5">
                {[
                  {
                    title: 'Clear trip phases',
                    desc: 'Pickup → arrived → in progress → complete, consistent with the shared ride model.',
                  },
                  {
                    title: 'Your schedule',
                    desc: 'Go online when you want to receive requests.',
                  },
                  {
                    title: 'Operations visibility',
                    desc: 'Use the admin dashboard to inspect the same ride and driver state (read-only).',
                  },
                ].map((benefit, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-velox-primary/12 text-velox-primary">
                      <Check size={15} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="font-bold text-velox-dark">{benefit.title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{benefit.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/app?role=driver" className={primaryBtn}>
                  Open as driver
                  <ChevronRight className="ml-1" size={20} />
                </Link>
                <Link to="/admin" className={secondaryBtn}>
                  Open admin
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-velox-dark via-[#2d1b42] to-[#1a0f26] p-7 shadow-[0_20px_64px_rgba(45,27,66,0.32)] sm:p-8"
            >
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-velox-accent/20 blur-3xl" />
              <p className="relative text-sm font-bold uppercase tracking-wider text-white/70">Driver experience</p>
              <p className="relative mt-4 text-2xl font-bold leading-snug text-white">
                Same app shell and ride records — riders and drivers stay aligned.
              </p>
              <div className="relative mt-7 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3 text-sm text-white/90">
                  <span>Build</span>
                  <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/85">
                    In development
                  </span>
                </div>
                <div className="h-px bg-white/10" />
                <p className="text-xs leading-relaxed text-white/80">
                  With the API running, you can walk through request → accept → trip updates using the same data as
                  production-shaped clients.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="border-t border-velox-primary/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex max-w-md flex-col items-center gap-3 sm:items-start">
              <div className="flex items-center gap-2">
                <Car className="text-velox-primary" size={24} strokeWidth={2.25} />
                <span className="text-xl font-bold tracking-tight text-velox-dark">Zeyago Ride</span>
              </div>
              <p className="text-center text-sm leading-relaxed text-slate-600 sm:text-left">
                Urban rides in Addis Ababa. The web marketing site; product delivery is the mobile app with optional
                Nest API. Language switcher in-app (English / አማርኛ).
              </p>
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12 lg:gap-16">
              <div>
                <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:text-left">
                  Product
                </p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-start">
                  <Link to="/app" className="text-sm font-semibold text-slate-700 hover:text-velox-primary">
                    Mobile app
                  </Link>
                  <Link to="/admin" className="text-sm font-semibold text-slate-700 hover:text-velox-primary">
                    Admin
                  </Link>
                </div>
              </div>
              <div>
                <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:text-left">
                  Legal
                </p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-start">
                  <span className="cursor-not-allowed text-sm text-slate-400" title="Coming soon">
                    Terms
                  </span>
                  <span className="cursor-not-allowed text-sm text-slate-400" title="Coming soon">
                    Privacy
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-100 pt-8">
            <p className="text-center text-xs text-slate-500 sm:text-left">
              © {new Date().getFullYear()} Zeyago Ride · Addis Ababa, Ethiopia
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
