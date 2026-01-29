/**
 * Input Handler Service
 *
 * Processes text and audio input from user.
 * Handles transcription preview, validation, and routing.
 *
 * Design Decisions:
 * - Transcription preview allows user to confirm/edit before submission
 * - Streaming partial transcripts for real-time feedback
 * - Audio processing prepared for native Swift bridge (FluidAudio)
 * - Event emitter for UI updates
 */

import { EventEmitter } from 'events';
import type {
  InputType,
  RecordingState,
  TranscriptionPreview,
  FastPathRoutingInput,
} from '@/types';
import { iso8601 } from '@/types';

export class InputHandler extends EventEmitter {
  private isRecording: boolean = false;
  private currentTranscription: string = '';
  private recordingStartTime: number = 0;
  private recordingDuration: number = 0;

  constructor() {
    super();
  }

  /**
   * Submit text input
   *
   * @param text - User-provided text input
   * @returns Routing input ready for fast path classification
   */
  public async submitText(text: string): Promise<FastPathRoutingInput> {
    const validationError = this.validateInput(text);
    if (validationError) {
      this.emit('input:validation-error', validationError);
      throw new Error(validationError);
    }

    return {
      type: 'text' as InputType,
      text: text.trim(),
      timestamp: iso8601(new Date().toISOString()),
      source: 'user_text',
      metadata: {
        char_length: text.length,
        word_count: text.trim().split(/\s+/).length,
      },
    };
  }

  /**
   * Start audio recording
   *
   * Prepares recording state and emits state change event.
   * Actual audio capture would be handled by native FluidAudio bridge.
   */
  public async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    this.isRecording = true;
    this.currentTranscription = '';
    this.recordingStartTime = Date.now();
    this.recordingDuration = 0;

    const state: RecordingState = {
      is_recording: true,
      duration_ms: 0,
      timestamp: iso8601(new Date().toISOString()),
    };

    this.emit('recording:state-change', state);
  }

  /**
   * Stop recording and return transcription preview
   *
   * In real implementation, this would get transcribed audio from FluidAudio bridge.
   */
  public async stopRecording(): Promise<TranscriptionPreview> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    this.isRecording = false;
    this.recordingDuration = Date.now() - this.recordingStartTime;

    const state: RecordingState = {
      is_recording: false,
      duration_ms: this.recordingDuration,
      timestamp: iso8601(new Date().toISOString()),
    };

    this.emit('recording:state-change', state);

    // Return transcription preview
    // In real implementation, transcription would come from FluidAudio/Ollama
    return {
      text: this.currentTranscription,
      confidence: 0.85, // Placeholder - would come from STT service
      language: 'en', // Placeholder
      duration: this.recordingDuration,
    };
  }

  /**
   * Confirm transcription and submit as routing input
   *
   * @param preview - Transcription preview (possibly edited by user)
   * @returns Routing input ready for fast path classification
   */
  public async confirmTranscription(preview: TranscriptionPreview): Promise<FastPathRoutingInput> {
    const validationError = this.validateInput(preview.text);
    if (validationError) {
      this.emit('input:validation-error', validationError);
      throw new Error(validationError);
    }

    return {
      type: 'voice' as InputType,
      text: preview.text.trim(),
      timestamp: iso8601(new Date().toISOString()),
      source: 'voice_input',
      metadata: {
        duration_ms: preview.duration,
        confidence: preview.confidence,
        language: preview.language,
        char_length: preview.text.length,
        word_count: preview.text.trim().split(/\s+/).length,
      },
    };
  }

  /**
   * Cancel active transcription
   */
  public cancelTranscription(): void {
    if (this.isRecording) {
      this.isRecording = false;
      this.currentTranscription = '';
      this.recordingDuration = 0;

      const state: RecordingState = {
        is_recording: false,
        duration_ms: 0,
        timestamp: iso8601(new Date().toISOString()),
      };

      this.emit('recording:state-change', state);
    }
  }

  /**
   * Update partial transcription (for streaming real-time feedback)
   *
   * In real implementation, this would be called by FluidAudio bridge
   * as partial transcripts become available.
   */
  public updatePartialTranscription(partial: string): void {
    if (this.isRecording) {
      this.currentTranscription = partial;
      this.emit('transcription:update', partial);
    }
  }

  /**
   * Get current recording state
   */
  public getRecordingState(): RecordingState {
    return {
      is_recording: this.isRecording,
      duration_ms: this.isRecording ? Date.now() - this.recordingStartTime : this.recordingDuration,
      timestamp: iso8601(new Date().toISOString()),
    };
  }

  /**
   * Validate input text
   *
   * @returns Error message if validation fails, null if valid
   */
  private validateInput(text: string): string | null {
    // Check for empty/whitespace only input
    if (!text || text.trim().length === 0) {
      return 'Input cannot be empty';
    }

    // Check minimum length (at least 2 characters)
    if (text.trim().length < 2) {
      return 'Input must be at least 2 characters';
    }

    // Check maximum length (prevent extremely long inputs)
    if (text.length > 10000) {
      return 'Input exceeds maximum length of 10,000 characters';
    }

    // Check for valid characters (basic validation)
    // Allow alphanumeric, punctuation, spaces, common symbols
    // For now, we're lenient and allow most characters
    // In stricter implementations, we could validate against a whitelist
    const invalidPattern = /[^\w\s\-.,!?;:'"()[\]{}/\\@#$%&*+=~`]/g;
    const hasInvalidChars = invalidPattern.test(text);

    // Log but don't reject invalid characters
    if (hasInvalidChars) {
      // In stricter implementations, we could reject these
    }

    return null;
  }
}

/**
 * Singleton instance
 */
let inputHandlerInstance: InputHandler | null = null;

/**
 * Get or create Input Handler singleton
 */
export function getInputHandler(): InputHandler {
  if (!inputHandlerInstance) {
    inputHandlerInstance = new InputHandler();
  }
  return inputHandlerInstance;
}
