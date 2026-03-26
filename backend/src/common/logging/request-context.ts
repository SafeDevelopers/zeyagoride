import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContextStore = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(context: RequestContextStore, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
