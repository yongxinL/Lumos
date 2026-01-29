/**
 * Input IPC Handlers
 * Handles user input operations (text, voice, transcription)
 */

import { registerHandler } from './handlers';
import { validatePayloadOrThrow } from './validation';
import type { InputSubmissionResult, InputState } from '../../types/ipc';

/**
 * Register all input-related IPC handlers
 */
export function registerInputHandlers(): void {
  // Submit text input
  registerHandler('input:submit-text', async (text) => {
    validatePayloadOrThrow('input:submit-text', text);

    // TODO: Implement actual text submission to input handler service
    // For now, return mock response
    const result: InputSubmissionResult = {
      inputId: crypto.randomUUID(),
      status: 'queued',
      message: 'Text input received and queued for processing',
    };

    console.log('[Input] Text submitted:', text);

    return result;
  });

  // Start voice recording
  registerHandler('input:start-recording', async () => {
    // TODO: Implement actual recording start via Swift helper
    // For now, return mock response
    const recordingId = crypto.randomUUID();

    console.log('[Input] Recording started:', recordingId);

    return { recordingId };
  });

  // Stop voice recording
  registerHandler('input:stop-recording', async () => {
    // TODO: Implement actual recording stop and transcription
    // For now, return mock response
    const transcription = 'Mock transcription result';

    console.log('[Input] Recording stopped');

    return { transcription };
  });

  // Confirm transcription
  registerHandler('input:confirm-transcription', async (preview) => {
    validatePayloadOrThrow('input:confirm-transcription', preview);

    // TODO: Implement actual transcription confirmation
    // For now, return mock response
    const result: InputSubmissionResult = {
      inputId: crypto.randomUUID(),
      status: 'queued',
      message: 'Transcription confirmed and queued for processing',
    };

    console.log('[Input] Transcription confirmed:', preview.text);

    return result;
  });

  // Get input state
  registerHandler('input:get-state', async () => {
    // TODO: Implement actual state retrieval from input handler service
    // For now, return mock response
    const state: InputState = {
      isRecording: false,
      isProcessing: false,
    };

    return state;
  });
}
