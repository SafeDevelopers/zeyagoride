/** Token for Nest DI — swap with Twilio/FCM provider without changing domain services. */
export const NOTIFICATION_DELIVERY_PROVIDER = Symbol('NOTIFICATION_DELIVERY_PROVIDER');

/**
 * Runs after the DB transaction that created the `NotificationEvent` commits.
 * Responsible for SMS/push (and optionally extra telemetry).
 */
export interface NotificationDeliveryProvider {
  processEventAfterCommit(eventId: string): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; provider: string; detail?: string }>;
}
