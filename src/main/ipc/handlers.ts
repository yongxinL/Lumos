/**
 * IPC Handler Registration System
 * Provides utilities for registering type-safe IPC handlers in the main process
 * AC-1.2.3.5: IPC handler registration in main process
 * AC-1.2.3.3: Request-response pattern with timeout and error handling
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type {
  IPCChannel,
  IPCResponse,
  IPCChannelPayloads,
  IPCChannelResponses,
} from '../../types/ipc';

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Type-safe IPC handler function
 */
export type IPCHandler<C extends IPCChannel> = (
  payload: IPCChannelPayloads[C],
  event: IpcMainInvokeEvent
) => Promise<IPCChannelResponses[C]> | IPCChannelResponses[C];

/**
 * Register a type-safe IPC handler with automatic error handling
 * Wraps handlers to ensure consistent response format and error handling
 */
export function registerHandler<C extends IPCChannel>(channel: C, handler: IPCHandler<C>): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, payload: IPCChannelPayloads[C]) => {
    const response: IPCResponse<IPCChannelResponses[C]> = {
      id: crypto.randomUUID(),
      success: false,
      timestamp: new Date().toISOString(),
    };

    try {
      // Execute handler
      const data = await handler(payload, event);
      response.success = true;
      response.data = data;
    } catch (error) {
      // Format error response
      response.error = {
        code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? { stack: error.stack } : error,
      };

      // Log error for debugging
      console.error(`[IPC Error] ${channel}:`, error);
    }

    return response;
  });
}

/**
 * Register multiple handlers at once
 * Useful for organizing handlers by domain
 */
export function registerHandlers(
  handlers: Array<{ channel: IPCChannel; handler: IPCHandler<any> }>
) {
  for (const { channel, handler } of handlers) {
    registerHandler(channel, handler);
  }
}

/**
 * Remove an IPC handler
 */
export function unregisterHandler(channel: IPCChannel): void {
  ipcMain.removeHandler(channel);
}

/**
 * Remove all IPC handlers
 * Useful for cleanup during shutdown
 */
export function unregisterAllHandlers(): void {
  // Electron doesn't provide a way to list all handlers,
  // so we need to manually track and remove them
  // For now, this is a placeholder
  console.warn('[IPC] Manual handler cleanup required');
}

// ============================================================================
// Handler Utilities
// ============================================================================

/**
 * Create a handler that validates input before processing
 */
export function createValidatedHandler<C extends IPCChannel>(
  validator: (payload: IPCChannelPayloads[C]) => boolean | string,
  handler: IPCHandler<C>
): IPCHandler<C> {
  return async (payload, event) => {
    const validation = validator(payload);

    if (validation === false || typeof validation === 'string') {
      throw new Error(typeof validation === 'string' ? validation : 'Invalid payload');
    }

    return handler(payload, event);
  };
}

/**
 * Create a handler with request logging
 */
export function createLoggedHandler<C extends IPCChannel>(
  channel: C,
  handler: IPCHandler<C>
): IPCHandler<C> {
  return async (payload, event) => {
    console.log(`[IPC Request] ${channel}`, payload);
    const startTime = Date.now();

    try {
      const result = await handler(payload, event);
      const duration = Date.now() - startTime;
      console.log(`[IPC Response] ${channel} (${duration}ms)`, result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[IPC Error] ${channel} (${duration}ms)`, error);
      throw error;
    }
  };
}

/**
 * Create a handler with rate limiting
 */
export function createRateLimitedHandler<C extends IPCChannel>(
  maxRequests: number,
  windowMs: number,
  handler: IPCHandler<C>
): IPCHandler<C> {
  const requests = new Map<number, number[]>();

  return async (payload, event) => {
    const senderId = event.sender.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request history for this sender
    let senderRequests = requests.get(senderId) || [];

    // Filter out old requests outside the time window
    senderRequests = senderRequests.filter((time) => time > windowStart);

    // Check if rate limit exceeded
    if (senderRequests.length >= maxRequests) {
      throw new Error(`Rate limit exceeded: max ${maxRequests} requests per ${windowMs}ms`);
    }

    // Add current request
    senderRequests.push(now);
    requests.set(senderId, senderRequests);

    // Execute handler
    return handler(payload, event);
  };
}

// ============================================================================
// Handler Middleware
// ============================================================================

/**
 * Middleware function type
 */
export type IPCMiddleware<C extends IPCChannel> = (
  payload: IPCChannelPayloads[C],
  event: IpcMainInvokeEvent,
  next: () => Promise<IPCChannelResponses[C]>
) => Promise<IPCChannelResponses[C]>;

/**
 * Apply middleware to a handler
 */
export function applyMiddleware<C extends IPCChannel>(
  handler: IPCHandler<C>,
  ...middlewares: IPCMiddleware<C>[]
): IPCHandler<C> {
  return async (payload, event) => {
    let index = 0;

    const next = async (): Promise<IPCChannelResponses[C]> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        return middleware(payload, event, next);
      }
      return handler(payload, event);
    };

    return next();
  };
}
