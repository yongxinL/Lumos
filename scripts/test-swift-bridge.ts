#!/usr/bin/env node
/**
 * Test script for Swift bridge communication
 * Verifies that the Swift helper can start, respond to requests, and shutdown cleanly
 */

import { SwiftBridge } from '../src/main/bridges/swift-bridge.js';

async function testSwiftBridge() {
  console.log('Testing Swift Bridge...\n');

  const bridge = new SwiftBridge();

  try {
    // Test 1: Start the Swift helper
    console.log('Test 1: Starting Swift helper...');
    await bridge.start();
    console.log('✓ Swift helper started successfully\n');

    // Test 2: Ping test
    console.log('Test 2: Sending ping...');
    const pingResult = await bridge.ping();
    console.log(`✓ Ping result: ${pingResult}\n`);

    // Test 3: Health check
    console.log('Test 3: Health check...');
    const healthResult = await bridge.healthCheck();
    console.log(`✓ Health check result: ${healthResult}\n`);

    // Test 4: Listen for events
    console.log('Test 4: Listening for events...');
    bridge.on('shutdown', () => {
      console.log('✓ Received shutdown event\n');
    });

    // Test 5: Stop the Swift helper
    console.log('Test 5: Stopping Swift helper...');
    await bridge.stop();
    console.log('✓ Swift helper stopped successfully\n');

    console.log('All tests passed! ✓');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testSwiftBridge();
