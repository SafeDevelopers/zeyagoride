import { getRequestId } from './request-context';

type LogLevel = 'log' | 'warn' | 'error' | 'debug';

export class StructuredLogger {
  constructor(private readonly scope: string) {}

  log(event: string, context?: Record<string, unknown>) {
    this.write('log', event, context);
  }

  warn(event: string, context?: Record<string, unknown>) {
    this.write('warn', event, context);
  }

  error(event: string, error: unknown, context?: Record<string, unknown>) {
    const detail =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          }
        : {
            errorMessage: String(error),
          };
    this.write('error', event, { ...context, ...detail });
  }

  debug(event: string, context?: Record<string, unknown>) {
    this.write('debug', event, context);
  }

  private write(level: LogLevel, event: string, context?: Record<string, unknown>) {
    const entry = {
      level,
      time: new Date().toISOString(),
      scope: this.scope,
      event,
      requestId: getRequestId(),
      ...(context ?? {}),
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
      return;
    }
    if (level === 'warn') {
      console.warn(line);
      return;
    }
    if (level === 'debug') {
      console.debug(line);
      return;
    }
    console.log(line);
  }
}
