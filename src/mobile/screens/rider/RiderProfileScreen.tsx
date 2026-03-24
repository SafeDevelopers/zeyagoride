import { motion, AnimatePresence } from 'motion/react';
import { X } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';

export function RiderProfileScreen() {
  const {
    language,
    setLanguage,
    showProfile,
    setShowProfile,
    userName,
    setUserName,
    userPhone,
    isEditingProfile,
    setIsEditingProfile,
    editName,
    setEditName,
  } = useMobileApp();

  return (
    <>
                    {/* Profile Modal */}
                    <AnimatePresence>
                      {showProfile && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowProfile(false); setIsEditingProfile(false); }}
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
                              <h3 className="text-2xl font-bold text-slate-900">Rider Profile</h3>
                              <button 
                                onClick={() => { setShowProfile(false); setIsEditingProfile(false); }} 
                                className="rounded-full bg-slate-100 p-2"
                              >
                                <X size={20} />
                              </button>
                            </div>
      
                            <div className="flex flex-col items-center mb-8">
                              <div className="relative mb-4 h-24 w-24 rounded-full bg-velox-accent/15 p-1 ring-4 ring-velox-accent/25">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="rounded-full" />
                              </div>
                              
                              {!isEditingProfile ? (
                                <>
                                  <h4 className="text-xl font-bold text-slate-900">{userName}</h4>
                                  <p className="text-sm text-slate-500">{userPhone}</p>
                                  <button 
                                    onClick={() => { setIsEditingProfile(true); setEditName(userName); }}
                                    className="mt-4 text-sm font-bold text-velox-primary"
                                  >
                                    Edit Profile
                                  </button>
                                </>
                              ) : (
                                <div className="w-full space-y-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                                    <input 
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-velox-primary"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => { setUserName(editName); setIsEditingProfile(false); }}
                                      className="flex min-h-[3rem] flex-1 items-center justify-center rounded-xl bg-velox-primary py-3 text-sm font-bold text-white"
                                    >
                                      Save Changes
                                    </button>
                                    <button 
                                      onClick={() => setIsEditingProfile(false)}
                                      className="flex min-h-[3rem] flex-1 items-center justify-center rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
      
                            <div className="space-y-6">
                              <div className="h-px bg-slate-100"></div>
                              <div>
                                <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Preferred Language</p>
                                <div className="flex gap-3">
                                  {[
                                    { code: 'en', label: 'English' },
                                    { code: 'am', label: 'አማርኛ' }
                                  ].map((lang) => (
                                    <button 
                                      key={lang.code}
                                      onClick={() => setLanguage(lang.code as 'en' | 'am')}
                                      className={`flex-1 rounded-2xl border p-4 text-center transition-all ${language === lang.code ? 'border-velox-primary bg-velox-primary/10 text-velox-primary' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}`}
                                    >
                                      <span className="block text-sm font-bold">{lang.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
    </>
  );
}
