import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script for Lumos Electron application
 * Exposes safe APIs to the renderer process
 */

const electronAPI = {
  send: (channel: string, data: unknown) => {
    if (['command', 'settings'].includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    if (['command-response', 'settings-response'].includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    }
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
