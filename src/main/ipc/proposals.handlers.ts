/**
 * Proposals IPC Handlers
 * Handles action proposal operations (get, confirm, reject)
 */

import { registerHandler } from './handlers';
import { validatePayloadOrThrow } from './validation';
import type { ActionProposal } from '../../types/index';

/**
 * Register all proposal-related IPC handlers
 */
export function registerProposalHandlers(): void {
  // Get pending proposals
  registerHandler('proposals:get-pending', async () => {
    // TODO: Implement actual proposal retrieval from proposal repository
    // For now, return empty array
    const proposals: ActionProposal[] = [];

    console.log('[Proposals] Getting pending proposals');

    return proposals;
  });

  // Confirm a proposal
  registerHandler('proposals:confirm', async (payload) => {
    validatePayloadOrThrow('proposals:confirm', payload);

    // TODO: Implement actual proposal confirmation
    // For now, return success
    console.log('[Proposals] Confirming proposal:', payload.proposalId);

    return {
      proposalId: payload.proposalId,
      confirmed: true,
    };
  });

  // Reject a proposal
  registerHandler('proposals:reject', async (payload) => {
    validatePayloadOrThrow('proposals:reject', payload);

    // TODO: Implement actual proposal rejection
    // For now, return success
    console.log('[Proposals] Rejecting proposal:', payload.proposalId, payload.reason);

    return {
      proposalId: payload.proposalId,
      rejected: true,
    };
  });

  // Get proposal history
  registerHandler('proposals:get-history', async (query) => {
    validatePayloadOrThrow('proposals:get-history', query);

    // TODO: Implement actual proposal history retrieval
    // For now, return empty array
    const proposals: ActionProposal[] = [];

    console.log('[Proposals] Getting proposal history with query:', query);

    return proposals;
  });
}
