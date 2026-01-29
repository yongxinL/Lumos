import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as crypto from 'crypto';

interface IPCMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'error';
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export class SwiftBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestCallbacks: Map<string, (result: unknown) => void> = new Map();
  private isReady = false;

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Swift helper is already running');
    }

    // Path to Swift executable
    // In development: swift/.build/debug/lumos-helper
    // In production: resources/lumos-helper
    const isDev = process.env.NODE_ENV === 'development';
    const executablePath = isDev
      ? path.join(__dirname, '../../../swift/.build/debug/lumos-helper')
      : path.join(process.resourcesPath, 'lumos-helper');

    // Spawn process
    this.process = spawn(executablePath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle stdout (messages from Swift)
    this.process.stdout?.on('data', (data: Buffer) => {
      const lines = data
        .toString()
        .split('\n')
        .filter((l: string) => l.trim());
      for (const line of lines) {
        this.handleMessage(line);
      }
    });

    // Handle stderr (errors from Swift)
    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('[Swift Helper]', data.toString());
    });

    // Handle process exit
    this.process.on('exit', (code) => {
      console.log(`Swift helper exited with code ${code}`);
      this.process = null;
      this.isReady = false;
      this.emit('exit', code);
    });

    // Handle process errors
    this.process.on('error', (error) => {
      console.error('[Swift Helper] Process error:', error);
      this.emit('error', error);
    });

    // Wait for ready event
    await this.waitForReady();
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      this.isReady = false;
    }
  }

  async sendRequest(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.process || !this.isReady) {
      throw new Error('Swift helper is not running');
    }

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();

      const message: IPCMessage = {
        id,
        type: 'request',
        method,
        params,
      };

      // Store callback
      this.requestCallbacks.set(id, resolve);

      // Send to Swift
      const json = JSON.stringify(message) + '\n';
      this.process?.stdin?.write(json);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.requestCallbacks.has(id)) {
          this.requestCallbacks.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 30000);
    });
  }

  private handleMessage(line: string): void {
    try {
      const message = JSON.parse(line) as IPCMessage;

      if (message.type === 'response') {
        const callback = this.requestCallbacks.get(message.id);
        if (callback) {
          callback(message.result);
          this.requestCallbacks.delete(message.id);
        }
      } else if (message.type === 'event') {
        if (message.method === 'ready') {
          this.isReady = true;
        }
        this.emit(message.method || 'unknown', message.params);
      } else if (message.type === 'error') {
        const callback = this.requestCallbacks.get(message.id);
        if (callback) {
          // Reject with error details
          callback(null);
          this.requestCallbacks.delete(message.id);
        }
        console.error('[Swift Helper] Error:', message.error);
      }
    } catch (error) {
      console.error('Failed to parse message from Swift:', error);
    }
  }

  private async waitForReady(): Promise<void> {
    if (this.isReady) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Swift helper did not send ready event'));
      }, 5000);

      this.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = (await this.sendRequest('health')) as { status?: string };
      return result?.status === 'healthy';
    } catch {
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = (await this.sendRequest('ping')) as { status?: string };
      return result?.status === 'ok';
    } catch {
      return false;
    }
  }

  // Audio recording methods
  async startRecording(): Promise<void> {
    const result = (await this.sendRequest('start_recording')) as { status?: string };
    if (result?.status !== 'recording') {
      throw new Error('Failed to start recording');
    }
  }

  async stopRecording(): Promise<{ finalText: string }> {
    const result = (await this.sendRequest('stop_recording')) as {
      status?: string;
      final_text?: string;
    };
    if (result?.status !== 'stopped') {
      throw new Error('Failed to stop recording');
    }
    return { finalText: result.final_text || '' };
  }

  async cancelRecording(): Promise<void> {
    const result = (await this.sendRequest('cancel_recording')) as { status?: string };
    if (result?.status !== 'cancelled') {
      throw new Error('Failed to cancel recording');
    }
  }

  async getRecordingState(): Promise<{ isRecording: boolean }> {
    const result = (await this.sendRequest('get_recording_state')) as { is_recording?: boolean };
    return { isRecording: result?.is_recording || false };
  }
}

// Singleton instance
let swiftBridgeInstance: SwiftBridge | null = null;

export function getSwiftBridge(): SwiftBridge {
  if (!swiftBridgeInstance) {
    swiftBridgeInstance = new SwiftBridge();
  }
  return swiftBridgeInstance;
}
