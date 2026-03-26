import { APP_SETTINGS_PATHS } from '../../contracts/backendContract';
import { request } from './client';

export type PricingSettings = {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  cancellationFee: number;
};

export type PromoSettings = {
  enabled: boolean;
  code: string;
  discountType: 'fixed' | 'percent';
  discountAmount: number;
  active: boolean;
};

export type AppSettings = {
  requireRideSafetyPin: boolean;
  demoAutoTripProgression: boolean;
  pricing: PricingSettings;
  promo: PromoSettings;
};

let cachedSettings: AppSettings | null = null;
let inFlightSettingsPromise: Promise<AppSettings> | null = null;

export const appSettingsService = {
  async getSettings(options?: { forceRefresh?: boolean }): Promise<AppSettings> {
    if (options?.forceRefresh) {
      cachedSettings = null;
      inFlightSettingsPromise = null;
    }
    if (cachedSettings) return cachedSettings;
    if (inFlightSettingsPromise) return inFlightSettingsPromise;
    inFlightSettingsPromise = request<AppSettings>('GET', APP_SETTINGS_PATHS.CURRENT)
      .then((settings) => {
        cachedSettings = settings;
        return settings;
      })
      .finally(() => {
        inFlightSettingsPromise = null;
      });
    return inFlightSettingsPromise;
  },

  async getPricingSettings(options?: { forceRefresh?: boolean }): Promise<PricingSettings> {
    const settings = await this.getSettings(options);
    return settings.pricing;
  },

  async getPromoSettings(options?: { forceRefresh?: boolean }): Promise<PromoSettings> {
    const settings = await this.getSettings(options);
    return settings.promo;
  },
};
