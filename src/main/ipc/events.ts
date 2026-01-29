/**
 * IPC Event Emitter System
 * Provides utilities for emitting events from main to renderer process
 * AC-1.2.3.4: Event subscription pattern for streaming updates
 */

import { BrowserWindow, type WebContents } from 'electron';
import type { IPCEventType, IPCEventPayloads } from '../../types/ipc';

// ============================================================================
// Event Emitter
// ============================================================================

/**
 * IPC Event Emitter class
 * Sends type-safe events from main process to renderer process
 */
export class IPCEventEmitter {
  private window: BrowserWindow | null;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  /**
   * Emit an event to the renderer process
   */
  emit<E extends IPCEventType>(type: E, payload: IPCEventPayloads[E]): void {
    if (!this.window || this.window.isDestroyed()) {
      console.warn(`[IPC Event] Cannot emit ${type}: window is destroyed`);
      return;
    }

    try {
      this.window.webContents.send(type, payload);
    } catch (error) {
      console.error(`[IPC Event] Failed to emit ${type}:`, error);
    }
  }

  /**
   * Emit an event to all windows
   */
  broadcast<E extends IPCEventType>(type: E, payload: IPCEventPayloads[E]): void {
    const windows = BrowserWindow.getAllWindows();

    for (const window of windows) {
      if (!window.isDestroyed()) {
        try {
          window.webContents.send(type, payload);
        } catch (error) {
          console.error(`[IPC Event] Failed to broadcast ${type}:`, error);
        }
      }
    }
  }

  /**
   * Check if the window is still valid
   */
  isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  /**
   * Update the target window
   */
  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  /**
   * Clear the window reference
   */
  clear(): void {
    this.window = null;
  }
}

// ============================================================================
// Global Event Emitter Instance
// ============================================================================

let globalEmitter: IPCEventEmitter | null = null;

/**
 * Initialize the global event emitter
 */
export function initializeEventEmitter(window: BrowserWindow): IPCEventEmitter {
  globalEmitter = new IPCEventEmitter(window);
  return globalEmitter;
}

/**
 * Get the global event emitter instance
 * Throws if not initialized
 */
export function getEventEmitter(): IPCEventEmitter {
  if (!globalEmitter) {
    throw new Error('Event emitter not initialized. Call initializeEventEmitter first.');
  }
  return globalEmitter;
}

/**
 * Emit an event using the global emitter
 * Convenience function for common use case
 */
export function emitEvent<E extends IPCEventType>(type: E, payload: IPCEventPayloads[E]): void {
  const emitter = getEventEmitter();
  emitter.emit(type, payload);
}

/**
 * Broadcast an event to all windows
 * Convenience function for common use case
 */
export function broadcastEvent<E extends IPCEventType>(
  type: E,
  payload: IPCEventPayloads[E]
): void {
  const windows = BrowserWindow.getAllWindows();

  for (const window of windows) {
    if (!window.isDestroyed()) {
      try {
        window.webContents.send(type, payload);
      } catch (error) {
        console.error(`[IPC Event] Failed to broadcast ${type}:`, error);
      }
    }
  }
}

// ============================================================================
// Event Utilities
// ============================================================================

/**
 * Emit an event to a specific WebContents
 */
export function emitToWebContents<E extends IPCEventType>(
  webContents: WebContents,
  type: E,
  payload: IPCEventPayloads[E]
): void {
  if (webContents.isDestroyed()) {
    console.warn(`[IPC Event] Cannot emit ${type}: webContents is destroyed`);
    return;
  }

  try {
    webContents.send(type, payload);
  } catch (error) {
    console.error(`[IPC Event] Failed to emit ${type}:`, error);
  }
}

/**
 * Create a throttled event emitter
 * Useful for high-frequency events like transcription updates
 */
export function createThrottledEmitter<E extends IPCEventType>(
  type: E,
  intervalMs: number
): (payload: IPCEventPayloads[E]) => void {
  let lastEmit = 0;
  let pending: IPCEventPayloads[E] | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (payload: IPCEventPayloads[E]) => {
    const now = Date.now();

    // If enough time has passed, emit immediately
    if (now - lastEmit >= intervalMs) {
      emitEvent(type, payload);
      lastEmit = now;
      pending = null;

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else {
      // Store the latest payload
      pending = payload;

      // Schedule emission if not already scheduled
      if (!timeoutId) {
        const delay = intervalMs - (now - lastEmit);
        timeoutId = setTimeout(() => {
          if (pending) {
            emitEvent(type, pending);
            lastEmit = Date.now();
            pending = null;
          }
          timeoutId = null;
        }, delay);
      }
    }
  };
}

/**
 * Create a debounced event emitter
 * Useful for events that should only fire after activity stops
 */
export function createDebouncedEmitter<E extends IPCEventType>(
  type: E,
  delayMs: number
): (payload: IPCEventPayloads[E]) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (payload: IPCEventPayloads[E]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      emitEvent(type, payload);
      timeoutId = null;
    }, delayMs);
  };
}
