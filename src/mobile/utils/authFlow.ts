import type { AuthStep } from '../types/mobile';

export function advanceAuthStep(
  step: AuthStep,
  setStep: (s: AuthStep) => void,
  setResendCooldown: (n: number) => void,
) {
  if (step === 'welcome') setStep('phone');
  else if (step === 'phone') {
    setStep('otp');
    setResendCooldown(30);
  } else if (step === 'otp') setStep('home');
}
