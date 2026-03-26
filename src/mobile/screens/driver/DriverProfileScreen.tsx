import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Car, Shield, Award, CheckCircle, AlertCircle, Clock, FileText } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';
import { authService } from '../../services/api';
import { updateStoredUser } from '../../services/sessionStorage';
import { IS_DEV_UI } from '../../utils/devUi';

/** Matches driver dashboard mock in DriverHomeScreen */
const MOCK_DRIVER_RATING = 4.95;
const MOCK_COMPLETED_TRIPS = 8;

function docStatusLabel(status: string) {
  if (status === 'verified') return 'Verified';
  if (status === 'expiring_soon') return 'Expiring soon';
  if (status === 'pending') return 'Pending';
  return status;
}

export function DriverProfileScreen() {
  const {
    showDriverProfile,
    setShowDriverProfile,
    isVerified,
    driverProfile,
    driverTier,
    driverVehicles,
    driverDocuments,
    vehicleDetails,
    currentUser,
    applyCurrentUser,
    profileFields,
    setProfileFields,
  } = useMobileApp();
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showDriverProfile) return;
    void authService
      .getProfile()
      .then((res) => {
        updateStoredUser(res.user);
        applyCurrentUser(res.user);
      })
      .catch(() => undefined);
  }, [applyCurrentUser, showDriverProfile]);

  const activeVehicle = driverVehicles[0];
  const vehicleSummary = activeVehicle
    ? `${activeVehicle.model} · ${activeVehicle.plate} · ${activeVehicle.color}`
    : vehicleDetails.make && vehicleDetails.model
      ? `${vehicleDetails.make} ${vehicleDetails.model}${vehicleDetails.tagNumber ? ` · ${vehicleDetails.tagNumber}` : ''}`
      : 'Add a vehicle under Vehicle Management';

  return (
    <>
      <AnimatePresence>
        {showDriverProfile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDriverProfile(false)}
              className="absolute inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-x-0 bottom-0 z-[90] flex max-h-[min(85vh,720px)] flex-col overflow-hidden rounded-t-[2.5rem] bg-white shadow-2xl"
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-8 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-6">
              <div className="mb-6 flex shrink-0 items-center justify-between gap-2">
                <h3 className="text-2xl font-bold text-slate-900">Driver Profile</h3>
                <button
                  type="button"
                  onClick={() => setShowDriverProfile(false)}
                  className="rounded-full bg-slate-100 p-2"
                  aria-label="Close profile"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6 flex flex-col items-center">
                <div className="relative mb-4 h-24 w-24 rounded-full bg-velox-accent/15 p-1 ring-4 ring-velox-accent/25">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=FelixDriver"
                    alt=""
                    className="rounded-full"
                  />
                </div>
                <h4 className="text-xl font-bold text-slate-900">{currentUser?.name || 'Driver'}</h4>
                <p className="text-sm text-slate-500">{currentUser?.phone || '—'}</p>
                <div
                  className={`mt-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    isVerified ? 'bg-velox-accent/15 text-velox-dark' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isVerified ? 'Verified driver' : 'Verification pending'}
                </div>
                {driverProfile?.vehicle && (
                  <div className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Vehicle {driverProfile.vehicle.status}
                  </div>
                )}
              </div>

              <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact profile</p>
                    <p className="mt-1 text-sm text-slate-500">Used for driver identity and admin review.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingContact) {
                        setProfileFields({
                          firstName: currentUser?.firstName ?? '',
                          lastName: currentUser?.lastName ?? '',
                          email: currentUser?.email ?? '',
                          address: currentUser?.address ?? '',
                        });
                      }
                      setIsEditingContact((prev) => !prev);
                    }}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {isEditingContact ? 'Close' : 'Edit'}
                  </button>
                </div>
                {isEditingContact ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={profileFields.firstName}
                        onChange={(e) => setProfileFields((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="First name"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-velox-primary"
                      />
                      <input
                        type="text"
                        value={profileFields.lastName}
                        onChange={(e) => setProfileFields((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Last name"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-velox-primary"
                      />
                    </div>
                    <input
                      type="email"
                      value={profileFields.email}
                      onChange={(e) => setProfileFields((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Email"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-velox-primary"
                    />
                    <input
                      type="text"
                      value={profileFields.address}
                      onChange={(e) => setProfileFields((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Address"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-velox-primary"
                    />
                    <input
                      type="text"
                      readOnly
                      value={currentUser?.phone ?? ''}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const res = await authService.updateProfile(profileFields);
                          updateStoredUser(res.user);
                          applyCurrentUser(res.user);
                          setIsEditingContact(false);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={
                        saving ||
                        !profileFields.firstName.trim() ||
                        !profileFields.lastName.trim() ||
                        !profileFields.email.trim() ||
                        !profileFields.address.trim()
                      }
                      className="w-full rounded-2xl bg-velox-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save contact profile'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">First name</p>
                      <p className="mt-1 font-bold text-slate-900">{currentUser?.firstName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last name</p>
                      <p className="mt-1 font-bold text-slate-900">{currentUser?.lastName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                      <p className="mt-1 font-bold text-slate-900">{currentUser?.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified phone</p>
                      <p className="mt-1 font-bold text-slate-900">{currentUser?.phone || '—'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</p>
                      <p className="mt-1 font-bold text-slate-900">{currentUser?.address || '—'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Star size={12} className="text-yellow-500" fill="currentColor" />
                    Rating
                  </div>
                  <p className="text-lg font-black text-slate-900">{MOCK_DRIVER_RATING.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400">
                    {IS_DEV_UI ? 'Demo aggregate' : 'Lifetime'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Trips</div>
                  <p className="text-lg font-black text-slate-900">{MOCK_COMPLETED_TRIPS}</p>
                  <p className="text-[10px] text-slate-400">{IS_DEV_UI ? 'Demo count' : 'Completed'}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Award size={12} className="text-velox-primary" />
                    Tier
                  </div>
                  <p className="text-lg font-bold text-velox-dark">{driverTier}</p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Car size={18} className="text-slate-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle</span>
                </div>
                <p className="break-words text-sm font-bold text-slate-900">{vehicleSummary}</p>
                {activeVehicle && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Status: {activeVehicle.status} · Insurance {activeVehicle.insuranceExpiry}
                  </p>
                )}
                {driverProfile?.vehicle?.rejectionReason && (
                  <p className="mt-2 text-[11px] font-medium text-red-600">
                    {driverProfile.vehicle.rejectionReason}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-slate-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Documents</span>
                </div>
                <div className="space-y-2">
                  {driverDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <doc.icon size={16} className="shrink-0 text-slate-500" />
                        <span className="truncate text-sm font-bold text-slate-800">{doc.title}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-[10px] font-bold">
                        {doc.status === 'verified' ? (
                          <span className="flex items-center gap-0.5 text-velox-primary">
                            <CheckCircle size={12} /> {docStatusLabel(doc.status)}
                          </span>
                        ) : doc.status === 'expiring_soon' ? (
                          <span className="flex items-center gap-0.5 text-amber-600">
                            <AlertCircle size={12} /> {docStatusLabel(doc.status)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-blue-600">
                            <Clock size={12} /> {docStatusLabel(doc.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {IS_DEV_UI && (
                  <p className="mt-3 text-[10px] text-slate-400">
                    Demo document statuses for onboarding preview.
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                <Shield size={16} className="mt-0.5 shrink-0" />
                <span>Background checks and document updates sync when connected to Zeyago backend.</span>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
