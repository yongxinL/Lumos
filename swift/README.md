# Lumos Helper - Swift Audio Bridge

This Swift package provides native macOS audio input capabilities for Lumos through a JSON-RPC bridge.

## Overview

The Swift helper process runs as a child process of the Electron main process, communicating via stdin/stdout using a JSON-RPC protocol. This architecture provides:

- Native macOS Speech Framework integration
- Real-time transcription streaming
- Microphone permission handling
- Graceful lifecycle management

## Project Structure

```
swift/
├── Package.swift                    # Swift Package Manager configuration
├── Sources/LumosHelper/
│   ├── main.swift                   # Entry point
│   ├── IPCProtocol.swift            # JSON-RPC message types
│   ├── MessageHandler.swift         # IPC communication handler
│   └── AudioHandler.swift           # Audio recording (T-2.2.2)
├── Tests/LumosHelperTests/
│   └── MessageHandlerTests.swift    # Unit tests
└── .swiftlint.yml                   # SwiftLint configuration
```

## Building

From project root:

```bash
# Debug build
pnpm build:swift

# Release build
pnpm build:swift:release

# Run tests
pnpm test:swift
```

Or directly with Swift:

```bash
cd swift
swift build                  # Debug
swift build -c release      # Release
swift test                   # Run tests
```

## IPC Protocol

The helper communicates using JSON-RPC messages over stdin/stdout:

### Message Types

- `request`: Request from Electron to Swift
- `response`: Response from Swift to Electron
- `event`: Asynchronous event from Swift to Electron
- `error`: Error response from Swift to Electron

### Message Format

```json
{
  "id": "uuid",
  "type": "request|response|event|error",
  "method": "method_name",
  "params": { ... },
  "result": { ... },
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Built-in Methods

- `ping`: Health check (returns `{status: "ok"}`)
- `health`: System health (returns `{status: "healthy", uptime: 123.45}`)

### Audio Methods (T-2.2.2)

- `audio:start-recording`: Start microphone recording
- `audio:stop-recording`: Stop and return transcription preview
- `audio:cancel-recording`: Cancel current recording

### Events

- `ready`: Helper process initialized
- `shutdown`: Helper process shutting down
- `recording:started`: Recording started successfully
- `recording:stopped`: Recording stopped with preview
- `recording:error`: Recording error occurred
- `transcription:update`: Streaming partial transcription

## Error Handling

The helper logs errors to stderr and never crashes the parent process. All errors are returned as structured error messages with codes:

- `INVALID_REQUEST`: Malformed request message
- `METHOD_NOT_FOUND`: Unknown method
- `AUDIO_ERROR`: Audio recording/transcription error
- `INTERNAL_ERROR`: Unexpected error

## Signal Handling

The helper gracefully handles shutdown signals:

- `SIGTERM`: Graceful shutdown
- `SIGINT`: Graceful shutdown

On shutdown, the helper:

1. Stops any active recordings
2. Sends a `shutdown` event
3. Exits with code 0

## Platform Requirements

- macOS 13.0+ (Ventura)
- Swift 5.9+
- Microphone access permission

## Development

### Adding New Methods

1. Add method handler in `MessageHandler.handleRequest()`
2. Implement logic in appropriate handler class
3. Document in this README
4. Add tests in `Tests/`

### Dependencies

Currently minimal dependencies. FluidAudio will be added in T-2.2.2:

```swift
dependencies: [
    .package(url: "https://github.com/fluid-audio/FluidAudio.git", from: "1.0.0")
]
```

## Integration with Electron

The TypeScript bridge is located at `src/main/bridges/swift-bridge.ts`. Example usage:

```typescript
import { getSwiftBridge } from './bridges/swift-bridge';

const bridge = getSwiftBridge();
await bridge.start();

const result = await bridge.ping();
console.log(result); // {status: "ok"}

await bridge.stop();
```

## License

MIT
