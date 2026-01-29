/**
 * Input Handler Service
 *
 * Processes text and audio input from user.
 * Handles transcription preview, validation, and routing.
 *
 * Design Decisions:
 * - Transcription preview allows user to confirm/edit before submission
 * - Streaming partial transcripts for real-time feedback
 * - Audio processing via native Swift bridge (FluidAudio)
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
import { getSwiftBridge, SwiftBridge } from '../bridges/swift-bridge';

export class InputHandler extends EventEmitter {
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private recordingDuration: number = 0;
  private swiftBridge: SwiftBridge | null = null;
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize Swift bridge for audio recording
   * Must be called before using audio features
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.swiftBridge = getSwiftBridge();
      await this.swiftBridge.start();

      // Listen to Swift audio events
      this.swiftBridge.on('recording_started', () => {
        this.handleRecordingStarted();
      });

      this.swiftBridge.on('recording_stopped', (params: Record<string, unknown>) => {
        const finalText = (params.final_text as string) || '';
        this.handleRecordingStopped(finalText);
      });

      this.swiftBridge.on('recording_cancelled', () => {
        this.handleRecordingCancelled();
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Swift bridge:', error);
      throw new Error('Failed to initialize audio recording');
    }
  }

  /**
   * Cleanup and stop Swift bridge
   */
  public async cleanup(): Promise<void> {
    if (this.swiftBridge) {
      await this.swiftBridge.stop();
      this.swiftBridge = null;
      this.isInitialized = false;
    }
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
   * Delegates to Swift bridge for actual audio capture via FluidAudio.
   */
  public async startRecording(): Promise<void> {
    if (!this.swiftBridge || !this.isInitialized) {
      throw new Error('Swift bridge not initialized. Call initialize() first.');
    }

    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Delegate to Swift bridge
      await this.swiftBridge.startRecording();

      // Swift will send recording_started event, which will update state
      this.recordingStartTime = Date.now();
      this.recordingDuration = 0;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Failed to start audio recording');
    }
  }

  /**
   * Stop recording and return transcription preview
   *
   * Gets final transcription from Swift bridge (FluidAudio).
   */
  public async stopRecording(): Promise<TranscriptionPreview> {
    if (!this.swiftBridge || !this.isInitialized) {
      throw new Error('Swift bridge not initialized. Call initialize() first.');
    }

    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    try {
      // Delegate to Swift bridge
      const result = await this.swiftBridge.stopRecording();

      // Calculate duration
      this.recordingDuration = Date.now() - this.recordingStartTime;

      // Swift will send recording_stopped event with final_text
      // But we also return it directly here
      return {
        text: result.finalText,
        confidence: 0.85, // FluidAudio doesn't expose confidence yet
        language: 'en', // Assuming English for now
        duration: this.recordingDuration,
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw new Error('Failed to stop audio recording');
    }
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
  public async cancelTranscription(): Promise<void> {
    if (!this.swiftBridge || !this.isInitialized) {
      throw new Error('Swift bridge not initialized. Call initialize() first.');
    }

    if (this.isRecording) {
      try {
        // Delegate to Swift bridge
        await this.swiftBridge.cancelRecording();

        // Swift will send recording_cancelled event, which will update state
      } catch (error) {
        console.error('Failed to cancel recording:', error);
        // Still update local state even if Swift call fails
        this.isRecording = false;
        this.recordingDuration = 0;

        const state: RecordingState = {
          is_recording: false,
          duration_ms: 0,
          timestamp: iso8601(new Date().toISOString()),
        };

        this.emit('recording:state-change', state);
      }
    }
  }

  /**
   * Update partial transcription (for streaming real-time feedback)
   *
   * Currently deferred due to Swift actor isolation challenges.
   * TODO: Implement when FluidAudio provides non-actor-isolated access.
   */
  public updatePartialTranscription(partial: string): void {
    if (this.isRecording) {
      // TODO: Store partial transcription when real-time streaming is available
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
   * Handle recording started event from Swift
   */
  private handleRecordingStarted(): void {
    this.isRecording = true;

    const state: RecordingState = {
      is_recording: true,
      duration_ms: 0,
      timestamp: iso8601(new Date().toISOString()),
    };

    this.emit('recording:state-change', state);
  }

  /**
   * Handle recording stopped event from Swift
   */
  private handleRecordingStopped(finalText: string): void {
    this.isRecording = false;
    this.recordingDuration = Date.now() - this.recordingStartTime;

    const state: RecordingState = {
      is_recording: false,
      duration_ms: this.recordingDuration,
      timestamp: iso8601(new Date().toISOString()),
    };

    this.emit('recording:state-change', state);

    // Emit transcription complete event with final text
    this.emit('transcription:complete', {
      text: finalText,
      confidence: 0.85,
      language: 'en',
      duration: this.recordingDuration,
    });
  }

  /**
   * Handle recording cancelled event from Swift
   */
  private handleRecordingCancelled(): void {
    this.isRecording = false;
    this.recordingDuration = 0;

    const state: RecordingState = {
      is_recording: false,
      duration_ms: 0,
      timestamp: iso8601(new Date().toISOString()),
    };

    this.emit('recording:state-change', state);
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
