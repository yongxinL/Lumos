/**
 * Input Handler Service Unit Tests
 *
 * Tests for text and audio input processing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InputHandler } from '../inputHandler';

describe('InputHandler', () => {
  let handler: InputHandler;

  beforeEach(() => {
    handler = new InputHandler();
  });

  describe('submitText', () => {
    it('should submit valid text input', async () => {
      const text = 'Schedule a meeting tomorrow';
      const result = await handler.submitText(text);

      expect(result.text).toBe(text);
      expect(result.type).toBe('text');
      expect(result.source).toBe('user_text');
      expect(result.metadata?.char_length).toBe(text.length);
      expect(result.metadata?.word_count).toBe(5);
    });

    it('should trim whitespace', async () => {
      const text = '  Hello world  ';
      const result = await handler.submitText(text);

      expect(result.text).toBe('Hello world');
    });

    it('should reject empty input', async () => {
      await expect(handler.submitText('')).rejects.toThrow('Input cannot be empty');
    });

    it('should reject whitespace-only input', async () => {
      await expect(handler.submitText('   ')).rejects.toThrow('Input cannot be empty');
    });

    it('should reject input shorter than 2 characters', async () => {
      await expect(handler.submitText('a')).rejects.toThrow('at least 2 characters');
    });

    it('should reject input longer than 10000 characters', async () => {
      const longText = 'a'.repeat(10001);
      await expect(handler.submitText(longText)).rejects.toThrow('exceeds maximum length');
    });

    it('should include timestamp in result', async () => {
      const result = await handler.submitText('Hello world');

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('Recording', () => {
    it('should start recording', async () => {
      await handler.startRecording();
      const state = handler.getRecordingState();

      expect(state.is_recording).toBe(true);
      expect(state.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should not allow starting recording twice', async () => {
      await handler.startRecording();
      await expect(handler.startRecording()).rejects.toThrow('already in progress');
    });

    it('should stop recording', async () => {
      await handler.startRecording();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate recording
      const preview = await handler.stopRecording();

      expect(preview).toBeDefined();
      expect(preview.text).toBeDefined();
      expect(preview.confidence).toBeDefined();
      expect(preview.duration).toBeGreaterThan(0);
    });

    it('should reject stop recording when not recording', async () => {
      await expect(handler.stopRecording()).rejects.toThrow('No recording in progress');
    });

    it('should cancel recording', async () => {
      await handler.startRecording();
      handler.cancelTranscription();
      const state = handler.getRecordingState();

      expect(state.is_recording).toBe(false);
    });

    it('should track recording duration', async () => {
      await handler.startRecording();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const preview = await handler.stopRecording();

      expect(preview.duration).toBeGreaterThanOrEqual(40);
    });
  });

  describe('confirmTranscription', () => {
    it('should confirm valid transcription', async () => {
      const preview = {
        text: 'Schedule a meeting tomorrow',
        confidence: 0.9,
        language: 'en',
        duration: 2500,
      };

      const result = await handler.confirmTranscription(preview);

      expect(result.text).toBe(preview.text);
      expect(result.type).toBe('voice');
      expect(result.source).toBe('voice_input');
      expect(result.metadata?.duration_ms).toBe(2500);
      expect(result.metadata?.confidence).toBe(0.9);
      expect(result.metadata?.language).toBe('en');
    });

    it('should reject empty transcription', async () => {
      const preview = {
        text: '',
        confidence: 0.9,
        language: 'en',
        duration: 0,
      };

      await expect(handler.confirmTranscription(preview)).rejects.toThrow();
    });

    it('should trim transcription text', async () => {
      const preview = {
        text: '  Hello world  ',
        confidence: 0.9,
        language: 'en',
        duration: 1000,
      };

      const result = await handler.confirmTranscription(preview);

      expect(result.text).toBe('Hello world');
    });
  });

  describe('updatePartialTranscription', () => {
    it('should update partial transcription during recording', async () => {
      let lastUpdate = '';
      handler.on('transcription:update', (partial: string) => {
        lastUpdate = partial;
      });

      await handler.startRecording();
      handler.updatePartialTranscription('Hello');
      handler.updatePartialTranscription('Hello world');

      expect(lastUpdate).toBe('Hello world');
    });

    it('should not update when not recording', async () => {
      let updateCount = 0;
      handler.on('transcription:update', () => {
        updateCount += 1;
      });

      handler.updatePartialTranscription('Test');

      expect(updateCount).toBe(0);
    });
  });

  describe('Event Emitter', () => {
    it('should emit recording state change', async () => {
      let emittedState: any = null;
      handler.on('recording:state-change', (state) => {
        emittedState = state;
      });

      await handler.startRecording();

      expect(emittedState).toBeDefined();
      expect(emittedState.is_recording).toBe(true);
    });

    it('should emit validation errors', async () => {
      let errorMessage = '';
      handler.on('input:validation-error', (error: string) => {
        errorMessage = error;
      });

      try {
        await handler.submitText('');
      } catch {
        // Expected error
      }

      expect(errorMessage).toBeTruthy();
    });
  });

  describe('getRecordingState', () => {
    it('should return not recording when idle', () => {
      const state = handler.getRecordingState();

      expect(state.is_recording).toBe(false);
      expect(state.duration_ms).toBe(0);
    });

    it('should return recording state with current duration', async () => {
      await handler.startRecording();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const state = handler.getRecordingState();

      expect(state.is_recording).toBe(true);
      expect(state.duration_ms).toBeGreaterThanOrEqual(10);
    });
  });
});
