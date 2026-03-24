/** Must match mobile `RideStatus` (`types/api.ts`). */
export enum RideStatus {
  Pending = 'pending',
  Matching = 'matching',
  DriverAssigned = 'driver_assigned',
  DriverArrived = 'driver_arrived',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}
