import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';
import { authService } from '../../services/api';
import { updateStoredUser } from '../../services/sessionStorage';

export function RiderProfileScreen() {
  const {
    language,
    setLanguage,
    showProfile,
    setShowProfile,
    userPhone,
    currentUser,
    applyCurrentUser,
    profileFields,
    setProfileFields,
    isEditingProfile,
    setIsEditingProfile,
  } = useMobileApp();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showProfile) return;
    void authService
      .getProfile()
      .then((res) => {
        updateStoredUser(res.user);
        applyCurrentUser(res.user);
      })
      .catch(() => undefined);
  }, [applyCurrentUser, showProfile]);

  return (
    <>
      <AnimatePresence>
        {showProfile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowProfile(false);
                setIsEditingProfile(false);
              }}
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
                    onClick={() => {
                      setShowProfile(false);
                      setIsEditingProfile(false);
                    }}
                    className="rounded-full bg-slate-100 p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-8 flex flex-col items-center">
                  <div className="relative mb-4 h-24 w-24 rounded-full bg-velox-accent/15 p-1 ring-4 ring-velox-accent/25">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="rounded-full" />
                  </div>

                  {!isEditingProfile ? (
                    <>
                      <h4 className="text-xl font-bold text-slate-900">{currentUser?.name || 'Rider'}</h4>
                      <p className="text-sm text-slate-500">{userPhone}</p>
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="mt-4 text-sm font-bold text-velox-primary"
                      >
                        Edit Profile
                      </button>
                    </>
                  ) : (
                    <div className="w-full space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First name</label>
                          <input
                            type="text"
                            value={profileFields.firstName}
                            onChange={(e) => setProfileFields((prev) => ({ ...prev, firstName: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-velox-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last name</label>
                          <input
                            type="text"
                            value={profileFields.lastName}
                            onChange={(e) => setProfileFields((prev) => ({ ...prev, lastName: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-velox-primary"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</label>
                        <input
                          type="email"
                          value={profileFields.email}
                          onChange={(e) => setProfileFields((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-velox-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</label>
                        <input
                          type="text"
                          value={profileFields.address}
                          onChange={(e) => setProfileFields((prev) => ({ ...prev, address: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-velox-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified phone</label>
                        <input
                          type="text"
                          readOnly
                          value={currentUser?.phone ?? userPhone}
                          className="w-full rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm font-medium text-slate-500 outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const res = await authService.updateProfile(profileFields);
                              updateStoredUser(res.user);
                              applyCurrentUser(res.user);
                              setIsEditingProfile(false);
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="flex min-h-[3rem] flex-1 items-center justify-center rounded-xl bg-velox-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                          disabled={
                            saving ||
                            !profileFields.firstName.trim() ||
                            !profileFields.lastName.trim() ||
                            !profileFields.email.trim() ||
                            !profileFields.address.trim()
                          }
                        >
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => {
                            setProfileFields({
                              firstName: currentUser?.firstName ?? '',
                              lastName: currentUser?.lastName ?? '',
                              email: currentUser?.email ?? '',
                              address: currentUser?.address ?? '',
                            });
                            setIsEditingProfile(false);
                          }}
                          className="flex min-h-[3rem] flex-1 items-center justify-center rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!isEditingProfile && (
                  <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{currentUser?.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{currentUser?.address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified phone</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{currentUser?.phone || userPhone}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-6">
                  <div className="h-px bg-slate-100"></div>
                  <div>
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Preferred Language</p>
                    <div className="flex gap-3">
                      {[
                        { code: 'en', label: 'English' },
                        { code: 'am', label: 'አማርኛ' },
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
