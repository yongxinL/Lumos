/**
 * End-to-End Audio Integration Test
 * Tests the full Swift ↔ Electron ↔ InputHandler flow
 *
 * This script tests:
 * 1. SwiftBridge initialization and health check
 * 2. InputHandler initialization with SwiftBridge
 * 3. Audio recording start/stop flow
 * 4. Event propagation from Swift to InputHandler
 * 5. IPC message flow validation
 */

import { getSwiftBridge } from '../src/main/bridges/swift-bridge';
import { getInputHandler } from '../src/main/services/inputHandler';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, duration?: number): void {
  results.push({ name, passed, error, duration });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const errorMsg = error ? ` - ${error}` : '';
  const durationMsg = duration ? ` (${duration}ms)` : '';
  console.log(`${status}: ${name}${errorMsg}${durationMsg}`);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Audio Integration Test Suite');
  console.log('='.repeat(60));
  console.log();

  const swiftBridge = getSwiftBridge();
  const inputHandler = getInputHandler();

  // Test 1: SwiftBridge Initialization
  console.log('[1/7] Testing SwiftBridge initialization...');
  try {
    const start = Date.now();
    await swiftBridge.start();
    const duration = Date.now() - start;
    logTest('SwiftBridge starts successfully', true, undefined, duration);
  } catch (error) {
    logTest('SwiftBridge starts successfully', false, String(error));
    return; // Cannot continue if bridge doesn't start
  }

  // Test 2: SwiftBridge Health Check
  console.log('[2/7] Testing SwiftBridge health check...');
  try {
    const start = Date.now();
    const healthy = await swiftBridge.healthCheck();
    const duration = Date.now() - start;
    logTest(
      'SwiftBridge health check passes',
      healthy,
      !healthy ? 'Health check failed' : undefined,
      duration
    );
  } catch (error) {
    logTest('SwiftBridge health check passes', false, String(error));
  }

  // Test 3: SwiftBridge Ping
  console.log('[3/7] Testing SwiftBridge ping...');
  try {
    const start = Date.now();
    const pong = await swiftBridge.ping();
    const duration = Date.now() - start;
    logTest('SwiftBridge responds to ping', pong, !pong ? 'Ping failed' : undefined, duration);
  } catch (error) {
    logTest('SwiftBridge responds to ping', false, String(error));
  }

  // Test 4: InputHandler Initialization
  console.log('[4/7] Testing InputHandler initialization...');
  try {
    const start = Date.now();
    await inputHandler.initialize();
    const duration = Date.now() - start;
    logTest('InputHandler initializes with SwiftBridge', true, undefined, duration);
  } catch (error) {
    logTest('InputHandler initializes with SwiftBridge', false, String(error));
    return; // Cannot continue if InputHandler doesn't initialize
  }

  // Test 5: Audio Recording Start
  console.log('[5/7] Testing audio recording start...');
  let recordingStartEventReceived = false;

  inputHandler.once('recording:state-change', (state) => {
    if (state.is_recording) {
      recordingStartEventReceived = true;
    }
  });

  try {
    const start = Date.now();
    await inputHandler.startRecording();
    await delay(100); // Wait for event propagation
    const duration = Date.now() - start;

    if (!recordingStartEventReceived) {
      logTest(
        'Audio recording starts successfully',
        false,
        'recording:state-change event not received'
      );
    } else {
      logTest('Audio recording starts successfully', true, undefined, duration);
    }
  } catch (error) {
    logTest('Audio recording starts successfully', false, String(error));
  }

  // Wait a bit to simulate recording
  console.log('[6/7] Simulating 2 seconds of recording...');
  await delay(2000);

  // Test 6: Audio Recording Stop
  console.log('[7/7] Testing audio recording stop...');
  let recordingStopEventReceived = false;
  let transcriptionReceived = false;

  inputHandler.once('recording:state-change', (state) => {
    if (!state.is_recording) {
      recordingStopEventReceived = true;
    }
  });

  inputHandler.once('transcription:complete', (preview) => {
    if (preview && preview.text !== undefined) {
      transcriptionReceived = true;
      console.log(`   📝 Transcription: "${preview.text}"`);
      console.log(`   ⏱️  Duration: ${preview.duration}ms`);
      console.log(`   🎯 Confidence: ${preview.confidence}`);
      console.log(`   🌐 Language: ${preview.language}`);
    }
  });

  try {
    const start = Date.now();
    const preview = await inputHandler.stopRecording();
    await delay(100); // Wait for event propagation
    const duration = Date.now() - start;

    if (!recordingStopEventReceived) {
      logTest(
        'Audio recording stops successfully',
        false,
        'recording:state-change event not received'
      );
    } else if (!transcriptionReceived) {
      logTest(
        'Audio recording stops successfully',
        false,
        'transcription:complete event not received'
      );
    } else if (!preview || preview.text === undefined) {
      logTest('Audio recording stops successfully', false, 'No transcription preview returned');
    } else {
      logTest('Audio recording stops successfully', true, undefined, duration);
    }
  } catch (error) {
    logTest('Audio recording stops successfully', false, String(error));
  }

  // Cleanup
  console.log();
  console.log('Cleaning up...');
  try {
    await inputHandler.cleanup();
    await swiftBridge.stop();
    console.log('✅ Cleanup successful');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }

  // Print Summary
  console.log();
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log();

  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
    console.log();
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
    console.log();
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
