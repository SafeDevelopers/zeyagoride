/**
 * Backend URL path templates for the mobile API client (Mapbox-ready).
 * Paths are canonical in `contracts/backendContract.ts` — TODO: align with NestJS global prefix / versioning.
 */

import { DRIVER_API_PATHS, HTTP_AUTH_PATHS, RIDER_RIDE_PATHS } from '../../contracts/backendContract';

export const endpoints = {
  auth: {
    loginWithPhone: () => HTTP_AUTH_PATHS.LOGIN_WITH_PHONE,
    verifyOtp: () => HTTP_AUTH_PATHS.VERIFY_OTP,
    refresh: () => HTTP_AUTH_PATHS.REFRESH,
    registerRider: () => HTTP_AUTH_PATHS.REGISTER_RIDER,
    registerDriver: () => HTTP_AUTH_PATHS.REGISTER_DRIVER,
    profile: () => HTTP_AUTH_PATHS.PROFILE,
  },
  rider: {
    rides: () => RIDER_RIDE_PATHS.COLLECTION,
    notifications: () => RIDER_RIDE_PATHS.NOTIFICATIONS,
    ride: (rideId: string) => RIDER_RIDE_PATHS.byId(rideId),
  },
  driver: {
    availability: () => DRIVER_API_PATHS.AVAILABILITY,
    profile: () => DRIVER_API_PATHS.PROFILE,
    incomingRequests: () => DRIVER_API_PATHS.INCOMING_REQUESTS,
    acceptRequest: (requestId: string) => DRIVER_API_PATHS.acceptRequest(requestId),
    declineRequest: (requestId: string) => DRIVER_API_PATHS.declineRequest(requestId),
    trip: (tripId: string) => DRIVER_API_PATHS.trip(tripId),
    tripArrive: (tripId: string) => DRIVER_API_PATHS.tripArrive(tripId),
    tripStart: (tripId: string) => DRIVER_API_PATHS.tripStart(tripId),
    tripComplete: (tripId: string) => DRIVER_API_PATHS.tripComplete(tripId),
    wallet: () => DRIVER_API_PATHS.WALLET,
    vehicle: () => DRIVER_API_PATHS.VEHICLE,
    walletTransactions: () => DRIVER_API_PATHS.WALLET_TRANSACTIONS,
    walletTopUpRequests: () => DRIVER_API_PATHS.WALLET_TOP_UP_REQUESTS,
    walletTopUpProof: (requestId: string) => DRIVER_API_PATHS.walletTopUpProof(requestId),
    notifications: () => DRIVER_API_PATHS.NOTIFICATIONS,
    notificationsRead: () => DRIVER_API_PATHS.NOTIFICATIONS_READ,
  },
} as const;
