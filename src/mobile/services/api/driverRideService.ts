import type {
  AcceptRideRequest,
  AcceptRideResponse,
  CompleteTripBody,
  DeclineRideRequest,
  DeclineRideResponse,
  DriverAvailabilityRequest,
  DriverAvailabilityResponse,
  DriverVehicleUpdateRequest,
  DriverProfile,
  DriverWalletSnapshot,
  GetTripResponse,
  ListDriverNotificationsResponse,
  ListDriverRequestsResponse,
  ListDriverTopUpRequestsResponse,
  ListDriverWalletTransactionsResponse,
  SubmitTopUpRequest,
} from '../../types/api';
import { USE_MOCK_API } from '../../config/env';
import {
  adaptAcceptRideResponse,
  adaptDriverAvailabilityResponse,
  adaptGetTripResponse,
  adaptListDriverRequestsResponse,
} from './adapters';
import { shouldDevFallbackToMock } from './devFallback';
import { request, requestMultipartJson } from './client';
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
  getProfile(): Promise<DriverProfile>;
  acceptRide(payload: AcceptRideRequest): Promise<AcceptRideResponse>;
  declineRide(payload: DeclineRideRequest): Promise<DeclineRideResponse>;
  listIncomingRequests(): Promise<ListDriverRequestsResponse>;
  getTrip(tripId: string): Promise<GetTripResponse>;
  tripArrive(tripId: string): Promise<GetTripResponse>;
  tripStart(tripId: string): Promise<GetTripResponse>;
  tripComplete(tripId: string, body?: CompleteTripBody): Promise<GetTripResponse>;
  getWallet(): Promise<DriverWalletSnapshot>;
  updateVehicle(payload: DriverVehicleUpdateRequest): Promise<{ vehicle: { status: string } }>;
  listWalletTransactions(): Promise<ListDriverWalletTransactionsResponse>;
  submitTopUpRequest(payload: SubmitTopUpRequest): Promise<{ id: string }>;
  listTopUpRequests(): Promise<ListDriverTopUpRequestsResponse>;
  uploadTopUpProof(requestId: string, file: File): Promise<{ proofUrl: string }>;
  listNotifications(): Promise<ListDriverNotificationsResponse>;
  markNotificationsRead(ids?: string[]): Promise<{ updated: number }>;
};

/**
 * In-app mock — same DTO shapes as real API when `USE_MOCK_API` is true.
 */
export const mockDriverRideService: DriverRideService = {
  async setDriverOnline(online: boolean): Promise<DriverAvailabilityResponse> {
    await delay(40);
    return { online };
  },

  async getProfile(): Promise<DriverProfile> {
    await delay(30);
    return {
      id: 'placeholder-driver',
      userId: 'placeholder-driver',
      name: 'Demo Driver',
      phone: '+251 911 223344',
      online: false,
      isVerified: false,
      verificationStatus: 'pending',
      vehicle: null,
      canGoOnline: false,
      onlineBlockingReasons: ['driver_account_not_approved', 'vehicle_missing'],
      activeTripCount: 0,
      walletBalance: 10_000,
      walletMinBalance: 100,
      walletWarningThreshold: 300,
      walletBlocked: false,
      walletBelowWarning: false,
    };
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

  async tripComplete(tripId: string, _body?: CompleteTripBody): Promise<GetTripResponse> {
    await delay(35);
    return mockTripAdvance(tripId, 'completed');
  },

  async getWallet(): Promise<DriverWalletSnapshot> {
    await delay(25);
    return {
      balance: 10_000,
      minBalance: 100,
      warningThreshold: 300,
      blocked: false,
      belowWarning: false,
    };
  },

  async updateVehicle(): Promise<{ vehicle: { status: string } }> {
    await delay(40);
    return { vehicle: { status: 'pending' } };
  },

  async listWalletTransactions(): Promise<ListDriverWalletTransactionsResponse> {
    await delay(25);
    return { transactions: [] };
  },

  async submitTopUpRequest(_payload: SubmitTopUpRequest): Promise<{ id: string }> {
    await delay(40);
    return { id: `mock-topup-${Date.now()}` };
  },

  async listTopUpRequests(): Promise<ListDriverTopUpRequestsResponse> {
    await delay(25);
    return { requests: [] };
  },

  async uploadTopUpProof(): Promise<{ proofUrl: string }> {
    await delay(40);
    return { proofUrl: 'https://example.com/proof' };
  },

  async listNotifications(): Promise<ListDriverNotificationsResponse> {
    await delay(25);
    return { notifications: [] };
  },

  async markNotificationsRead(): Promise<{ updated: number }> {
    await delay(20);
    return { updated: 0 };
  },
};

function createDriverRideApiService(): DriverRideService {
  return {
    async setDriverOnline(online: boolean): Promise<DriverAvailabilityResponse> {
      const body: DriverAvailabilityRequest = { online };
      const raw = await request<unknown>('PUT', endpoints.driver.availability(), body);
      return adaptDriverAvailabilityResponse(raw, online);
    },

    async getProfile(): Promise<DriverProfile> {
      return request<DriverProfile>('GET', endpoints.driver.profile());
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

    async tripComplete(tripId: string, body?: CompleteTripBody): Promise<GetTripResponse> {
      const raw = await request<unknown>(
        'POST',
        endpoints.driver.tripComplete(tripId),
        body ?? {},
      );
      return adaptGetTripResponse(raw);
    },

    async getWallet(): Promise<DriverWalletSnapshot> {
      return request<DriverWalletSnapshot>('GET', endpoints.driver.wallet());
    },

    async updateVehicle(payload: DriverVehicleUpdateRequest): Promise<{ vehicle: { status: string } }> {
      return request<{ vehicle: { status: string } }>('PUT', endpoints.driver.vehicle(), payload);
    },

    async listWalletTransactions(): Promise<ListDriverWalletTransactionsResponse> {
      return request<ListDriverWalletTransactionsResponse>(
        'GET',
        endpoints.driver.walletTransactions(),
      );
    },

    async submitTopUpRequest(payload: SubmitTopUpRequest): Promise<{ id: string }> {
      return request<{ id: string }>('POST', endpoints.driver.walletTopUpRequests(), payload);
    },

    async listTopUpRequests(): Promise<ListDriverTopUpRequestsResponse> {
      return request<ListDriverTopUpRequestsResponse>('GET', endpoints.driver.walletTopUpRequests());
    },

    async uploadTopUpProof(requestId: string, file: File): Promise<{ proofUrl: string }> {
      const fd = new FormData();
      fd.append('proof', file);
      return requestMultipartJson<{ proofUrl: string }>(
        'PUT',
        endpoints.driver.walletTopUpProof(requestId),
        fd,
      );
    },

    async listNotifications(): Promise<ListDriverNotificationsResponse> {
      return request<ListDriverNotificationsResponse>('GET', endpoints.driver.notifications());
    },

    async markNotificationsRead(ids?: string[]): Promise<{ updated: number }> {
      return request<{ updated: number }>('PUT', endpoints.driver.notificationsRead(), {
        ids: ids?.length ? ids : undefined,
      });
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
    async getProfile(): Promise<DriverProfile> {
      try {
        return await api.getProfile();
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.getProfile();
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
    async tripComplete(tripId: string, body?: CompleteTripBody): Promise<GetTripResponse> {
      try {
        return await api.tripComplete(tripId, body);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.tripComplete(tripId, body);
        throw e;
      }
    },
    async getWallet(): Promise<DriverWalletSnapshot> {
      try {
        return await api.getWallet();
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.getWallet();
        throw e;
      }
    },
    async updateVehicle(payload: DriverVehicleUpdateRequest): Promise<{ vehicle: { status: string } }> {
      try {
        return await api.updateVehicle(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.updateVehicle(payload);
        throw e;
      }
    },
    async listWalletTransactions(): Promise<ListDriverWalletTransactionsResponse> {
      try {
        return await api.listWalletTransactions();
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.listWalletTransactions();
        throw e;
      }
    },
    async submitTopUpRequest(payload: SubmitTopUpRequest): Promise<{ id: string }> {
      try {
        return await api.submitTopUpRequest(payload);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.submitTopUpRequest(payload);
        throw e;
      }
    },
    async listTopUpRequests(): Promise<ListDriverTopUpRequestsResponse> {
      try {
        return await api.listTopUpRequests();
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.listTopUpRequests();
        throw e;
      }
    },
    async uploadTopUpProof(requestId: string, file: File): Promise<{ proofUrl: string }> {
      try {
        return await api.uploadTopUpProof(requestId, file);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.uploadTopUpProof(requestId, file);
        throw e;
      }
    },
    async listNotifications(): Promise<ListDriverNotificationsResponse> {
      try {
        return await api.listNotifications();
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.listNotifications();
        throw e;
      }
    },
    async markNotificationsRead(ids?: string[]): Promise<{ updated: number }> {
      try {
        return await api.markNotificationsRead(ids);
      } catch (e) {
        if (shouldDevFallbackToMock(e)) return mockDriverRideService.markNotificationsRead(ids);
        throw e;
      }
    },
  };
}

export const driverRideService: DriverRideService = USE_MOCK_API
  ? mockDriverRideService
  : createDriverRideApiServiceWithDevFallback();
