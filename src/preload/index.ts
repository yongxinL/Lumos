import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  IPCChannel,
  IPCEventType,
  IPCChannelPayloads,
  IPCChannelResponses,
  IPCEventPayloads,
  IPCResponse,
} from '../types/ipc';

/**
 * Preload script for Lumos Electron application
 * Exposes type-safe IPC APIs to the renderer process
 * AC-1.2.1.7: Context isolation and sandbox enabled for renderer
 * AC-1.2.3.1: Preload script with contextBridge API exposure
 * AC-1.2.3.3: Request-response pattern with timeout and error handling
 * AC-1.2.3.4: Event subscription pattern for streaming updates
 */

// ============================================================================
// Type-Safe IPC API
// ============================================================================

/**
 * Type-safe IPC invoke function
 * Supports request-response pattern with proper error handling
 */
async function invoke<C extends IPCChannel>(
  channel: C,
  payload: IPCChannelPayloads[C]
): Promise<IPCChannelResponses[C]> {
  const response: IPCResponse<IPCChannelResponses[C]> = await ipcRenderer.invoke(channel, payload);

  if (!response.success) {
    const error = new Error(response.error?.message || 'IPC request failed');
    error.name = response.error?.code || 'IPCError';
    throw error;
  }

  return response.data as IPCChannelResponses[C];
}

/**
 * Event subscription with unsubscribe support
 */
function on<E extends IPCEventType>(
  event: E,
  callback: (payload: IPCEventPayloads[E]) => void
): () => void {
  const wrappedCallback = (_: IpcRendererEvent, data: IPCEventPayloads[E]) => {
    callback(data);
  };

  ipcRenderer.on(event, wrappedCallback as any);

  // Return unsubscribe function
  return () => {
    ipcRenderer.removeListener(event, wrappedCallback as any);
  };
}

/**
 * One-time event listener
 */
function once<E extends IPCEventType>(
  event: E,
  callback: (payload: IPCEventPayloads[E]) => void
): void {
  ipcRenderer.once(event, (_: IpcRendererEvent, data: IPCEventPayloads[E]) => {
    callback(data);
  });
}

// ============================================================================
// Exposed API
// ============================================================================

const api = {
  // Core IPC methods
  invoke,
  on,
  once,

  // Legacy methods for backward compatibility (will be deprecated)
  send: (channel: string, data: unknown) => {
    const validChannels = ['error-log', 'new-chat', 'command-palette', 'navigate-to'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // Convenience methods for common operations
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Navigation handlers (from global shortcuts)
  onNavigate: (handler: (path: string) => void) => {
    ipcRenderer.on('navigate-to', (_event, path: string) => handler(path));
    return () => ipcRenderer.removeAllListeners('navigate-to');
  },
  onNewChat: (handler: () => void) => {
    ipcRenderer.on('new-chat', () => handler());
    return () => ipcRenderer.removeAllListeners('new-chat');
  },
  onCommandPalette: (handler: () => void) => {
    ipcRenderer.on('command-palette', () => handler());
    return () => ipcRenderer.removeAllListeners('command-palette');
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('api', api);

// ============================================================================
// Type Declarations for Renderer
// ============================================================================

export type API = typeof api;

// This will be used in renderer via window.api
declare global {
  interface Window {
    api: API;
  }
}
