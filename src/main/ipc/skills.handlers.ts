/**
 * Skills IPC Handlers
 * Handles skill-related operations (list, get, activate, deactivate)
 */

import { registerHandler } from './handlers';
import { validatePayloadOrThrow } from './validation';
import type { Skill } from '../../types/index';

/**
 * Register all skill-related IPC handlers
 */
export function registerSkillHandlers(): void {
  // List skills
  registerHandler('skills:list', async (query) => {
    validatePayloadOrThrow('skills:list', query);

    // TODO: Implement actual skill listing from skill repository
    // For now, return empty array
    const skills: Skill[] = [];

    console.log('[Skills] List requested with query:', query);

    return skills;
  });

  // Get a specific skill
  registerHandler('skills:get', async (payload) => {
    validatePayloadOrThrow('skills:get', payload);

    // TODO: Implement actual skill retrieval from skill repository
    // For now, throw not found error
    throw new Error(`Skill not found: ${payload.skillId}`);
  });

  // Activate a skill
  registerHandler('skills:activate', async (payload) => {
    validatePayloadOrThrow('skills:activate', payload);

    // TODO: Implement actual skill activation in skill registry
    // For now, return success
    console.log('[Skills] Activating skill:', payload.skillId);

    return { success: true };
  });

  // Deactivate a skill
  registerHandler('skills:deactivate', async (payload) => {
    validatePayloadOrThrow('skills:deactivate', payload);

    // TODO: Implement actual skill deactivation in skill registry
    // For now, return success
    console.log('[Skills] Deactivating skill:', payload.skillId);

    return { success: true };
  });

  // Reload skills from filesystem
  registerHandler('skills:reload', async () => {
    // TODO: Implement actual skill reloading from filesystem
    // For now, return mock count
    console.log('[Skills] Reloading skills from filesystem');

    return { count: 0 };
  });
}
