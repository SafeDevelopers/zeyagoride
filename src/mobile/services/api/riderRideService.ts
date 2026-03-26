import type {
  CancelRideRequest,
  CancelRideResponse,
  GetRideResponse,
  ListRiderNotificationsResponse,
  RequestRideRequest,
  RequestRideResponse,
  RideSummary,
} from '../../types/api';
import { USE_MOCK_API } from '../../config/env';
import { adaptCancelRideResponse, adaptRideSummary, isRecord } from './adapters';
import { shouldDevFallbackToMock } from './devFallback';
import { request } from './client';
import { delay } from './delay';
import { endpoints } from './endpoints';
import {
  mockCancelRideById,
  mockGetRide,
  mockRegisterRideAfterRequest,
} from './mockRideRegistry';
import { toMatchingRide, toRequestCreatedRide } from '../rides/rideLifecycle';
import { RIDE_EVENT } from '../../contracts/backendContract';
import { emitMockRideEvent } from '../rides/rideEvents';

export type RiderRideService = {
  requestRide(payload: RequestRideRequest): Promise<RequestRideResponse>;
  cancelRide(payload: CancelRideRequest): Promise<CancelRideResponse>;
  getRide(rideId: string): Promise<GetRideResponse>;
};

let mockRideSeq = 1;

function nextMockRideId(): string {
  return `ride-mock-${Date.now()}-${mockRideSeq++}`;
}

function mockRideSummaryFromRequest(payload: RequestRideRequest): RideSummary {
  const id = nextMockRideId();
  const now = new Date().toISOString();
  const base: RideSummary = {
    id,
    riderId: 'mock-rider-1',
    driverId: null,
    status: 'pending',
    pickup: payload.pickup,
    destination: payload.destination,
    pickupAddress: payload.pickupAddress,
    destinationAddress: payload.destinationAddress,
    pickupCoords: payload.pickupCoords,
    destinationCoords: payload.destinationCoords,
    stops: payload.stops.map((s) => ({ ...s, coords: s.coords ? { ...s.coords } : null })),
    vehicleType: payload.vehicleType,
    profileType: payload.profileType,
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime,
    distanceMeters: payload.distanceMeters,
    durationSeconds: payload.durationSeconds,
    fareEstimate: payload.fareEstimate ? { ...payload.fareEstimate } : undefined,
    createdAt: now,
    updatedAt: now,
  };
  const pending = toRequestCreatedRide(base);
  emitMockRideEvent({ type: RIDE_EVENT.REQUESTED, rideId: pending.id, ride: pending });
  const ride = toMatchingRide(pending);
  emitMockRideEvent({ type: RIDE_EVENT.MATCHING, rideId: ride.id, ride });
  return ride;
}

/**
 * In-app mock — same DTO shapes as real API when `USE_MOCK_API` is true.
 */
export const mockRiderRideService: RiderRideService = {
  async requestRide(payload: RequestRideRequest): Promise<RequestRideResponse> {
    await delay(80);
    const ride = mockRideSummaryFromRequest(payload);
    mockRegisterRideAfterRequest(ride);
    return { ride };
  },

  async cancelRide(payload: CancelRideRequest): Promise<CancelRideResponse> {
    await delay(60);
    mockCancelRideById(payload.rideId);
    return { cancelled: true };
  },

  async getRide(rideId: string): Promise<GetRideResponse> {
    await delay(40);
    const res = mockGetRide(rideId);
    if (!res) {
      throw new Error('ride_not_found');
    }
    return res;
  },
};

function createRiderRideApiService(): RiderRideService {
  return {
    async requestRide(payload: RequestRideRequest): Promise<RequestRideResponse> {
      const raw = await request<unknown>('POST', endpoints.rider.rides(), payload);
      const rideRaw = isRecord(raw) && raw.ride !== undefined ? raw.ride : raw;
      return { ride: adaptRideSummary(rideRaw) };
    },

    async cancelRide(payload: CancelRideRequest): Promise<CancelRideResponse> {
      const { rideId, reason } = payload;
      const raw = await request<unknown>(
        'DELETE',
        endpoints.rider.ride(rideId),
        reason !== undefined ? { reason } : undefined,
      );
      return adaptCancelRideResponse(raw);
    },

    async getRide(rideId: string): Promise<GetRideResponse> {
      const raw = await request<unknown>('GET', endpoints.rider.ride(rideId));
      const rideRaw = isRecord(raw) && raw.ride !== undefined ? raw.ride : raw;
      return { ride: adaptRideSummary(rideRaw) };
    },
  };
}

function createRiderRideApiServiceWithDevFallback(): RiderRideService {
  const api = createRiderRideApiService();
  return {
    async requestRide(payload: RequestRideRequest): Promise<RequestRideResponse> {
      try {
        return await api.requestRide(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockRiderRideService.requestRide(payload);
        throw e;
      }
    },
    async cancelRide(payload: CancelRideRequest): Promise<CancelRideResponse> {
      try {
        return await api.cancelRide(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockRiderRideService.cancelRide(payload);
        throw e;
      }
    },
    async getRide(rideId: string): Promise<GetRideResponse> {
      try {
        return await api.getRide(rideId);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockRiderRideService.getRide(rideId);
        throw e;
      }
    },
  };
}

export const riderRideService: RiderRideService = USE_MOCK_API
  ? mockRiderRideService
  : createRiderRideApiServiceWithDevFallback();

/** Backend persisted rider inbox (optional; UI may keep using local ride events until wired). */
export async function fetchRiderNotifications(): Promise<ListRiderNotificationsResponse> {
  if (USE_MOCK_API) {
    return { notifications: [] };
  }
  return request<ListRiderNotificationsResponse>('GET', endpoints.rider.notifications());
}
