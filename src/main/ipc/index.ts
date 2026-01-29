/**
 * IPC Module Entry Point
 * Exports all IPC-related functionality and handler registration
 */

// Core utilities
export * from './handlers';
export * from './events';
export * from './validation';

// Handler registration functions
export { registerSystemHandlers } from './system.handlers';
export { registerInputHandlers } from './input.handlers';
export { registerSkillHandlers } from './skills.handlers';
export { registerProposalHandlers } from './proposals.handlers';

// Re-export types for convenience
export type {
  IPCChannel,
  IPCEventType,
  IPCChannelPayloads,
  IPCChannelResponses,
  IPCEventPayloads,
  IPCRequest,
  IPCResponse,
  IPCEvent,
  IPCError,
} from '../../types/ipc';

/**
 * Register all IPC handlers
 * Call this during application initialization
 */
export function registerAllIPCHandlers(): void {
  const { registerSystemHandlers } = require('./system.handlers');
  const { registerInputHandlers } = require('./input.handlers');
  const { registerSkillHandlers } = require('./skills.handlers');
  const { registerProposalHandlers } = require('./proposals.handlers');

  console.log('[IPC] Registering all IPC handlers...');

  registerSystemHandlers();
  registerInputHandlers();
  registerSkillHandlers();
  registerProposalHandlers();

  console.log('[IPC] All IPC handlers registered successfully');
}
