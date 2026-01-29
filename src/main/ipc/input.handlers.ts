/**
 * Input IPC Handlers
 * Handles user input operations (text, voice, transcription)
 */

import { registerHandler } from './handlers';
import { validatePayloadOrThrow } from './validation';
import type { InputSubmissionResult, InputState } from '../../types/ipc';
import { getInputHandler } from '../services/inputHandler';

// Get singleton instance of input handler
const inputHandler = getInputHandler();

/**
 * Initialize input handler with Swift bridge
 * Must be called before handlers can be used
 */
export async function initializeInputHandler(): Promise<void> {
  try {
    await inputHandler.initialize();
    console.log('[Input] InputHandler initialized successfully');
  } catch (error) {
    console.error('[Input] Failed to initialize InputHandler:', error);
    throw error;
  }
}

/**
 * Cleanup input handler on app shutdown
 */
export async function cleanupInputHandler(): Promise<void> {
  try {
    await inputHandler.cleanup();
    console.log('[Input] InputHandler cleaned up successfully');
  } catch (error) {
    console.error('[Input] Failed to cleanup InputHandler:', error);
  }
}

/**
 * Register all input-related IPC handlers
 */
export function registerInputHandlers(): void {
  // Submit text input
  registerHandler('input:submit-text', async (text) => {
    validatePayloadOrThrow('input:submit-text', text);

    try {
      const routingInput = await inputHandler.submitText(text);

      // TODO: Route to fast path service for classification
      const result: InputSubmissionResult = {
        inputId: crypto.randomUUID(),
        status: 'queued',
        message: 'Text input received and queued for processing',
      };

      console.log('[Input] Text submitted:', routingInput);

      return result;
    } catch (error) {
      console.error('[Input] Failed to submit text:', error);
      throw error;
    }
  });

  // Start voice recording
  registerHandler('input:start-recording', async () => {
    try {
      await inputHandler.startRecording();
      const recordingId = crypto.randomUUID();

      console.log('[Input] Recording started:', recordingId);

      return { recordingId };
    } catch (error) {
      console.error('[Input] Failed to start recording:', error);
      throw error;
    }
  });

  // Stop voice recording
  registerHandler('input:stop-recording', async () => {
    try {
      const preview = await inputHandler.stopRecording();

      console.log('[Input] Recording stopped, transcription:', preview.text);

      return {
        transcription: preview.text,
        confidence: preview.confidence,
        language: preview.language,
        duration: preview.duration,
      };
    } catch (error) {
      console.error('[Input] Failed to stop recording:', error);
      throw error;
    }
  });

  // Confirm transcription
  registerHandler('input:confirm-transcription', async (preview) => {
    validatePayloadOrThrow('input:confirm-transcription', preview);

    try {
      const routingInput = await inputHandler.confirmTranscription(preview);

      // TODO: Route to fast path service for classification
      const result: InputSubmissionResult = {
        inputId: crypto.randomUUID(),
        status: 'queued',
        message: 'Transcription confirmed and queued for processing',
      };

      console.log('[Input] Transcription confirmed:', routingInput);

      return result;
    } catch (error) {
      console.error('[Input] Failed to confirm transcription:', error);
      throw error;
    }
  });

  // Get input state
  registerHandler('input:get-state', async () => {
    try {
      const recordingState = inputHandler.getRecordingState();

      const state: InputState = {
        isRecording: recordingState.is_recording,
        isProcessing: false, // TODO: Track processing state
      };

      return state;
    } catch (error) {
      console.error('[Input] Failed to get input state:', error);
      throw error;
    }
  });
}
