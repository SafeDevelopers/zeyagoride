import type {
  AcceptRideRequest,
  AcceptRideResponse,
  DeclineRideRequest,
  DeclineRideResponse,
  DriverAvailabilityRequest,
  DriverAvailabilityResponse,
  GetTripResponse,
  ListDriverRequestsResponse,
} from '../../types/api';
import { USE_MOCK_API } from '../../config/env';
import {
  adaptAcceptRideResponse,
  adaptDriverAvailabilityResponse,
  adaptGetTripResponse,
  adaptListDriverRequestsResponse,
} from './adapters';
import { shouldDevFallbackToMock } from './devFallback';
import { request } from './client';
import { delay } from './delay';
import { endpoints } from './endpoints';
import {
  mockAcceptRequest,
  mockDeclineRequest,
  mockGetTrip,
  mockListDriverIncomingRequests,
  mockTripAdvance,
} from './mockRideRegistry';

export type DriverRideService = {
  setDriverOnline(online: boolean): Promise<DriverAvailabilityResponse>;
  acceptRide(payload: AcceptRideRequest): Promise<AcceptRideResponse>;
  declineRide(payload: DeclineRideRequest): Promise<DeclineRideResponse>;
  listIncomingRequests(): Promise<ListDriverRequestsResponse>;
  getTrip(tripId: string): Promise<GetTripResponse>;
  tripArrive(tripId: string): Promise<GetTripResponse>;
  tripStart(tripId: string): Promise<GetTripResponse>;
  tripComplete(tripId: string): Promise<GetTripResponse>;
};

/**
 * In-app mock — same DTO shapes as real API when `USE_MOCK_API` is true.
 */
export const mockDriverRideService: DriverRideService = {
  async setDriverOnline(online: boolean): Promise<DriverAvailabilityResponse> {
    await delay(40);
    return { online };
  },

  async acceptRide(payload: AcceptRideRequest): Promise<AcceptRideResponse> {
    await delay(70);
    return mockAcceptRequest(payload.requestId);
  },

  async declineRide(payload: DeclineRideRequest): Promise<DeclineRideResponse> {
    await delay(50);
    return mockDeclineRequest(payload.requestId);
  },

  async listIncomingRequests(): Promise<ListDriverRequestsResponse> {
    await delay(30);
    return mockListDriverIncomingRequests();
  },

  async getTrip(tripId: string): Promise<GetTripResponse> {
    await delay(35);
    const res = mockGetTrip(tripId);
    if (!res) {
      throw new Error('trip_not_found');
    }
    return res;
  },

  async tripArrive(tripId: string): Promise<GetTripResponse> {
    await delay(35);
    return mockTripAdvance(tripId, 'driver_arrived');
  },

  async tripStart(tripId: string): Promise<GetTripResponse> {
    await delay(35);
    return mockTripAdvance(tripId, 'in_progress');
  },

  async tripComplete(tripId: string): Promise<GetTripResponse> {
    await delay(35);
    return mockTripAdvance(tripId, 'completed');
  },
};

function createDriverRideApiService(): DriverRideService {
  return {
    async setDriverOnline(online: boolean): Promise<DriverAvailabilityResponse> {
      const body: DriverAvailabilityRequest = { online };
      const raw = await request<unknown>('PUT', endpoints.driver.availability(), body);
      return adaptDriverAvailabilityResponse(raw, online);
    },

    async acceptRide(payload: AcceptRideRequest): Promise<AcceptRideResponse> {
      const raw = await request<unknown>(
        'POST',
        endpoints.driver.acceptRequest(payload.requestId),
        payload,
      );
      return adaptAcceptRideResponse(raw);
    },

    async declineRide(payload: DeclineRideRequest): Promise<DeclineRideResponse> {
      await request<unknown>('POST', endpoints.driver.declineRequest(payload.requestId), payload);
      return { declined: true };
    },

    async listIncomingRequests(): Promise<ListDriverRequestsResponse> {
      const raw = await request<unknown>('GET', endpoints.driver.incomingRequests());
      return adaptListDriverRequestsResponse(raw);
    },

    async getTrip(tripId: string): Promise<GetTripResponse> {
      const raw = await request<unknown>('GET', endpoints.driver.trip(tripId));
      return adaptGetTripResponse(raw);
    },

    async tripArrive(tripId: string): Promise<GetTripResponse> {
      const raw = await request<unknown>('POST', endpoints.driver.tripArrive(tripId));
      return adaptGetTripResponse(raw);
    },

    async tripStart(tripId: string): Promise<GetTripResponse> {
      const raw = await request<unknown>('POST', endpoints.driver.tripStart(tripId));
      return adaptGetTripResponse(raw);
    },

    async tripComplete(tripId: string): Promise<GetTripResponse> {
      const raw = await request<unknown>('POST', endpoints.driver.tripComplete(tripId));
      return adaptGetTripResponse(raw);
    },
  };
}

function createDriverRideApiServiceWithDevFallback(): DriverRideService {
  const api = createDriverRideApiService();
  return {
    async setDriverOnline(online: boolean): Promise<DriverAvailabilityResponse> {
      try {
        return await api.setDriverOnline(online);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.setDriverOnline(online);
        throw e;
      }
    },
    async acceptRide(payload: AcceptRideRequest): Promise<AcceptRideResponse> {
      try {
        return await api.acceptRide(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.acceptRide(payload);
        throw e;
      }
    },
    async declineRide(payload: DeclineRideRequest): Promise<DeclineRideResponse> {
      try {
        return await api.declineRide(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.declineRide(payload);
        throw e;
      }
    },
    async listIncomingRequests(): Promise<ListDriverRequestsResponse> {
      try {
        return await api.listIncomingRequests();
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.listIncomingRequests();
        throw e;
      }
    },
    async getTrip(tripId: string): Promise<GetTripResponse> {
      try {
        return await api.getTrip(tripId);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.getTrip(tripId);
        throw e;
      }
    },
    async tripArrive(tripId: string): Promise<GetTripResponse> {
      try {
        return await api.tripArrive(tripId);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.tripArrive(tripId);
        throw e;
      }
    },
    async tripStart(tripId: string): Promise<GetTripResponse> {
      try {
        return await api.tripStart(tripId);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.tripStart(tripId);
        throw e;
      }
    },
    async tripComplete(tripId: string): Promise<GetTripResponse> {
      try {
        return await api.tripComplete(tripId);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.tripComplete(tripId);
        throw e;
      }
    },
  };
}

export const driverRideService: DriverRideService = USE_MOCK_API
  ? mockDriverRideService
  : createDriverRideApiServiceWithDevFallback();
