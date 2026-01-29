import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script for Lumos Electron application
 * Exposes safe APIs to the renderer process
 * AC-1.2.1.7: Context isolation and sandbox enabled for renderer
 */

const electronAPI = {
  send: (channel: string, data: unknown) => {
    const validChannels = [
      'command',
      'settings',
      'error-log',
      'new-chat',
      'command-palette',
      'navigate-to',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    const validChannels = ['command-response', 'settings-response'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    }
  },
  // Additional APIs for specific functionality
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onNavigate: (handler: (path: string) => void) => {
    ipcRenderer.on('navigate-to', (_event, path: string) => handler(path));
  },
  onNewChat: (handler: () => void) => {
    ipcRenderer.on('new-chat', () => handler());
  },
  onCommandPalette: (handler: () => void) => {
    ipcRenderer.on('command-palette', () => handler());
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
