/**
 * System IPC Handlers
 * Handles system-level operations (version, info, updates, restart)
 */

import { app } from 'electron';
import { registerHandler } from './handlers';
import type { SystemInfo, UpdateInfo } from '../../types/ipc';

/**
 * Register all system-related IPC handlers
 */
export function registerSystemHandlers(): void {
  // Get system information
  registerHandler('system:get-info', async () => {
    const info: SystemInfo = {
      platform: process.platform,
      arch: process.arch,
      version: process.getSystemVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      appVersion: app.getVersion(),
    };

    return info;
  });

  // Get app version
  registerHandler('system:get-version', async () => {
    return { version: app.getVersion() };
  });

  // Check for updates
  registerHandler('system:check-updates', async () => {
    // TODO: Implement actual update checking with electron-updater
    // For now, return placeholder
    const updateInfo: UpdateInfo = {
      available: false,
    };

    return updateInfo;
  });

  // Restart application
  registerHandler('system:restart', async () => {
    app.relaunch();
    app.exit(0);
  });
}
