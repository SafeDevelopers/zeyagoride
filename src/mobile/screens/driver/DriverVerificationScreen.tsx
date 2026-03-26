import { ChevronRight, Clock, FileText, Camera, User, CreditCard, Car, CheckCircle } from '../lucideIcons';
import { useMobileApp } from '../../context/MobileAppContext';
import { driverRideService } from '../../services/api';

export function DriverVerificationScreen() {
  const {
    setMode,
    setIsVerified,
    verificationStep,
    setVerificationStep,
    vehicleDetails,
    setVehicleDetails,
  } = useMobileApp();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-y-contain bg-white velox-safe-x pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4">
      <div className="mb-6 flex shrink-0 items-center justify-between pt-2">
        <h2 className="text-2xl font-bold text-slate-900">Driver Verification</h2>
        <button type="button" onClick={() => setMode('rider')} className="text-sm font-bold text-velox-primary">
          Switch to Rider
        </button>
      </div>

      {verificationStep === 'start' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl bg-velox-primary/10 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-velox-primary text-white">
              <FileText size={24} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Become a Zeyago Driver</h3>
            <p className="text-sm text-slate-600">
              To start earning with Zeyago, we need to verify your documents. This usually takes less than 24 hours.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'profile_pic', label: 'Profile Picture', icon: User },
              { id: 'national_id', label: 'National ID / Passport', icon: CreditCard },
              { id: 'license', label: 'Driving License', icon: FileText },
              { id: 'registration', label: 'Vehicle Registration', icon: Car },
              { id: 'insurance', label: 'Insurance Policy', icon: CheckCircle },
            ].map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                    <doc.icon size={20} />
                  </div>
                  <span className="font-bold text-slate-900">{doc.label}</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setVerificationStep('profile_pic')}
            className="mt-2 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
          >
            Get Started
          </button>
        </div>
      )}

      {(verificationStep === 'profile_pic' ||
        verificationStep === 'national_id' ||
        verificationStep === 'license' ||
        verificationStep === 'vehicle_details' ||
        verificationStep === 'registration' ||
        verificationStep === 'insurance') && (
        <div className="flex flex-col gap-4">
          <div className="flex shrink-0 items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (verificationStep === 'profile_pic') setVerificationStep('start');
                else if (verificationStep === 'national_id') setVerificationStep('profile_pic');
                else if (verificationStep === 'license') setVerificationStep('national_id');
                else if (verificationStep === 'vehicle_details') setVerificationStep('license');
                else if (verificationStep === 'registration') setVerificationStep('vehicle_details');
                else if (verificationStep === 'insurance') setVerificationStep('registration');
              }}
              className="flex items-center gap-2 text-slate-400"
            >
              <ChevronRight className="rotate-180" size={20} />
              <span className="text-sm font-bold">Back</span>
            </button>
            <div className="flex gap-1">
              {['profile_pic', 'national_id', 'license', 'vehicle_details', 'registration', 'insurance'].map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 w-5 rounded-full transition-all ${
                    ['profile_pic', 'national_id', 'license', 'vehicle_details', 'registration', 'insurance'].indexOf(
                      verificationStep,
                    ) >= i
                      ? 'bg-velox-primary'
                      : 'bg-slate-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {verificationStep === 'vehicle_details' ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-slate-900">Vehicle Details</h3>
              <p className="text-sm text-slate-500">Tell us about the vehicle you&apos;ll be driving.</p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle Make</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-velox-primary"
                    value={vehicleDetails.make}
                    onChange={(e) => setVehicleDetails({ ...vehicleDetails, make: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Vitz"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-velox-primary"
                    value={vehicleDetails.model}
                    onChange={(e) => setVehicleDetails({ ...vehicleDetails, model: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Color</label>
                    <input
                      type="text"
                      placeholder="e.g. Silver"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-velox-primary"
                      value={vehicleDetails.color}
                      onChange={(e) => setVehicleDetails({ ...vehicleDetails, color: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Seats</label>
                    <select
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-velox-primary"
                      value={vehicleDetails.capacity}
                      onChange={(e) => setVehicleDetails({ ...vehicleDetails, capacity: e.target.value })}
                    >
                      <option value="4">4 Seats</option>
                      <option value="6">6 Seats</option>
                      <option value="7">7+ Seats</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Plate / tag number (type exactly as on your vehicle)
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Enter your exact plate or tag number"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:border-velox-primary"
                    value={vehicleDetails.tagNumber}
                    onChange={(e) => setVehicleDetails({ ...vehicleDetails, tagNumber: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setVerificationStep('registration')}
                disabled={!vehicleDetails.make || !vehicleDetails.model || !vehicleDetails.tagNumber}
                className="mt-2 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-slate-900">
                {verificationStep === 'profile_pic'
                  ? 'Upload Profile Picture'
                  : verificationStep === 'national_id'
                    ? 'Upload National ID'
                    : verificationStep === 'license'
                      ? 'Upload Driving License'
                      : verificationStep === 'registration'
                        ? 'Upload Vehicle Registration'
                        : 'Upload Insurance Policy'}
              </h3>
              <p className="text-sm text-slate-500">
                {verificationStep === 'profile_pic'
                  ? 'Please take a clear photo of your face. No sunglasses or hats.'
                  : `Please take a clear photo of your ${verificationStep.replace('_', ' ')}. All details must be readable.`}
              </p>

              <div
                className={`flex min-h-[200px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 ${
                  verificationStep === 'profile_pic' ? 'mx-auto aspect-square max-h-[280px] w-full max-w-[280px]' : ''
                }`}
              >
                <div className="text-center">
                  <div
                    className={`mx-auto mb-4 flex items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ${
                      verificationStep === 'profile_pic' ? 'h-24 w-24' : 'h-16 w-16'
                    }`}
                  >
                    <Camera size={verificationStep === 'profile_pic' ? 40 : 32} />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Tap to take photo</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (verificationStep === 'profile_pic') setVerificationStep('national_id');
                  else if (verificationStep === 'national_id') setVerificationStep('license');
                  else if (verificationStep === 'license') setVerificationStep('vehicle_details');
                  else if (verificationStep === 'registration') setVerificationStep('insurance');
                  else if (verificationStep === 'insurance') setVerificationStep('pending');
                }}
                className="mt-2 w-full rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {verificationStep === 'pending' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-velox-accent/15 text-velox-primary">
            <Clock size={48} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Verification Pending</h3>
          <p className="mb-2 text-sm text-slate-500">
            We&apos;ve received your documents and are reviewing them. We&apos;ll notify you once you&apos;re approved!
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const profile = await driverRideService.getProfile();
                setIsVerified(profile.isVerified);
                if (profile.isVerified) {
                  setVerificationStep('start');
                  setMode('driver');
                }
              } catch {
                /* keep waiting state */
              }
            }}
            className="min-h-[3.25rem] w-full max-w-sm rounded-2xl bg-velox-primary py-4 font-bold text-white shadow-lg shadow-[0_8px_24px_rgba(75,44,109,0.18)]"
          >
            Check verification status
          </button>
        </div>
      )}
    </div>
  );
}
