/**
 * Global type declarations for renderer process
 * Extends the Window interface with Electron IPC APIs
 */

import type {
  IPCChannel,
  IPCEventType,
  IPCChannelPayloads,
  IPCChannelResponses,
  IPCEventPayloads,
} from '../types/ipc';

declare global {
  interface Window {
    /**
     * Type-safe IPC API exposed via contextBridge
     */
    api: {
      /**
       * Invoke an IPC handler with type-safe request-response
       */
      invoke: <C extends IPCChannel>(
        channel: C,
        payload: IPCChannelPayloads[C]
      ) => Promise<IPCChannelResponses[C]>;

      /**
       * Subscribe to an IPC event
       * Returns an unsubscribe function
       */
      on: <E extends IPCEventType>(
        event: E,
        callback: (payload: IPCEventPayloads[E]) => void
      ) => () => void;

      /**
       * Subscribe to an IPC event (one-time)
       */
      once: <E extends IPCEventType>(
        event: E,
        callback: (payload: IPCEventPayloads[E]) => void
      ) => void;

      /**
       * Legacy send method (for backward compatibility)
       */
      send: (channel: string, data: unknown) => void;

      /**
       * Get app version (convenience method)
       */
      getAppVersion: () => Promise<{ version: string }>;

      /**
       * Navigation event handlers
       */
      onNavigate: (handler: (path: string) => void) => () => void;
      onNewChat: (handler: () => void) => () => void;
      onCommandPalette: (handler: () => void) => () => void;
    };

    /**
     * Legacy electron API (deprecated, use window.api instead)
     */
    electron?: {
      send: (channel: string, data: unknown) => void;
      receive: (channel: string, func: (...args: unknown[]) => void) => void;
      getAppVersion: () => Promise<{ version: string }>;
      onNavigate: (handler: (path: string) => void) => void;
      onNewChat: (handler: () => void) => void;
      onCommandPalette: (handler: () => void) => void;
    };
  }
}

export {};
