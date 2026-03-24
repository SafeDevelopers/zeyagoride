import { motion, AnimatePresence } from 'motion/react';
import { X } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';

export function DriverHistoryScreen() {
  const {
    showEarningsHistory,
    setShowEarningsHistory,
  } = useMobileApp();

  return (
    <>
                    <AnimatePresence>
                      {showEarningsHistory && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowEarningsHistory(false)}
                            className="absolute inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm"
                          />
                          <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="absolute inset-x-0 bottom-0 z-[90] flex max-h-[min(85vh,720px)] flex-col overflow-hidden rounded-t-[2.5rem] bg-white shadow-2xl"
                          >
                            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-8 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-6">
                            <div className="mb-6 flex shrink-0 items-center justify-between">
                              <h3 className="text-xl font-bold text-slate-900">Earnings History</h3>
                              <button onClick={() => setShowEarningsHistory(false)} className="rounded-full bg-slate-100 p-2">
                                <X size={20} />
                              </button>
                            </div>
                            
                            <div className="space-y-4">
                              {[
                                { id: 1, time: '14:20', from: 'Bole Medhanialem', to: 'Kazanchis', fare: 'ETB 180.00' },
                                { id: 2, time: '13:45', from: 'Piazza', to: 'Old Airport', fare: 'ETB 210.00' },
                                { id: 3, time: '12:10', from: 'Sarbet', to: 'Megenagna', fare: 'ETB 145.00' },
                                { id: 4, time: '11:30', from: 'CMC', to: 'Bole Atlas', fare: 'ETB 195.00' },
                                { id: 5, time: '10:15', from: 'Gerji', to: 'Meskel Square', fare: 'ETB 120.00' },
                              ].map((trip) => (
                                <div key={trip.id} className="rounded-2xl border border-slate-100 p-4 hover:bg-slate-50 transition-colors">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400">{trip.time}</span>
                                    <span className="text-sm font-bold text-velox-primary">{trip.fare}</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-velox-primary/100"></div>
                                      <p className="min-w-0 truncate text-xs font-medium text-slate-600">{trip.from}</p>
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2">
                                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"></div>
                                      <p className="min-w-0 truncate text-xs font-medium text-slate-600">{trip.to}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
    </>
  );
}
