import type { Dispatch, SetStateAction } from 'react';
import type { AppNotification } from '../../types/mobile';
import type { DriverRequestEvent, RideEvent } from './rideEvents';
import {
  DRIVER_REQUEST_EVENT,
  RIDE_EVENT,
  subscribeToAllRideEvents,
  subscribeToDriverRequestEvents,
} from './rideEvents';

export type RideNotificationSeverity = 'info' | 'success' | 'warning';

export type RideNotificationItem = {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  type: RideNotificationSeverity;
};

let nextRideNotificationId = 10_000;

function nextId(): number {
  nextRideNotificationId += 1;
  return nextRideNotificationId;
}

function formatNotificationTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

function destinationSnippet(ride: RideEvent['ride']): string {
  const d = ride?.destination?.trim();
  if (!d) return 'your destination';
  const first = d.split(',')[0]?.trim();
  return first || d;
}

/** Maps normalized ride events → user-facing copy (rider-oriented). */
export function rideEventToNotificationItem(event: RideEvent): RideNotificationItem {
  const dest = destinationSnippet(event.ride);
  const time = formatNotificationTime(event.occurredAt);
  switch (event.type) {
    case RIDE_EVENT.REQUESTED:
      return {
        id: nextId(),
        title: 'Ride requested',
        message: `We received your trip to ${dest}.`,
        timestamp: time,
        type: 'info',
      };
    case RIDE_EVENT.MATCHING:
      return {
        id: nextId(),
        title: 'Finding a driver',
        message: `Matching you with a driver for ${dest}.`,
        timestamp: time,
        type: 'info',
      };
    case RIDE_EVENT.ASSIGNED:
      return {
        id: nextId(),
        title: 'Driver assigned',
        message: 'A driver is on the way to your pickup.',
        timestamp: time,
        type: 'success',
      };
    case RIDE_EVENT.ARRIVED:
      return {
        id: nextId(),
        title: 'Driver arrived',
        message: 'Your driver has arrived at the pickup point.',
        timestamp: time,
        type: 'success',
      };
    case RIDE_EVENT.STARTED:
      return {
        id: nextId(),
        title: 'Trip started',
        message: `Heading to ${dest}.`,
        timestamp: time,
        type: 'info',
      };
    case RIDE_EVENT.COMPLETED:
      return {
        id: nextId(),
        title: 'Trip completed',
        message: `You have arrived near ${dest}.`,
        timestamp: time,
        type: 'success',
      };
    case RIDE_EVENT.CANCELLED:
      return {
        id: nextId(),
        title: 'Ride cancelled',
        message: 'Your ride was cancelled.',
        timestamp: time,
        type: 'warning',
      };
  }
}

/** Maps driver request events → user-facing copy (driver-oriented). */
export function driverRequestEventToNotificationItem(event: DriverRequestEvent): RideNotificationItem {
  const time = formatNotificationTime(event.occurredAt);
  switch (event.type) {
    case DRIVER_REQUEST_EVENT.INCOMING:
      return {
        id: nextId(),
        title: 'New ride request',
        message: event.pickup && event.destination
          ? `${event.pickup} → ${event.destination}`
          : 'Open the app to view pickup and destination.',
        timestamp: time,
        type: 'info',
      };
    case DRIVER_REQUEST_EVENT.EXPIRED:
      return {
        id: nextId(),
        title: 'Request no longer available',
        message: 'A ride request expired or was removed from your queue.',
        timestamp: time,
        type: 'warning',
      };
  }
}

function toAppNotification(item: RideNotificationItem): AppNotification {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    type: item.type,
    time: item.timestamp,
    read: false,
  };
}

/**
 * Wire ride + driver-request events into the existing `notifications` list (prepend, unread).
 * Returns an unsubscribe to run on teardown.
 */
export function initRideNotifications(
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>,
): () => void {
  const onRide = (event: RideEvent) => {
    const item = rideEventToNotificationItem(event);
    const row = toAppNotification(item);
    setNotifications((prev) => [row, ...prev]);
  };
  const onDriver = (event: DriverRequestEvent) => {
    const item = driverRequestEventToNotificationItem(event);
    const row = toAppNotification(item);
    setNotifications((prev) => [row, ...prev]);
  };
  const unsubRide = subscribeToAllRideEvents(onRide);
  const unsubDriver = subscribeToDriverRequestEvents(onDriver);
  return () => {
    unsubRide();
    unsubDriver();
  };
}
