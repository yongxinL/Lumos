import Foundation

class MessageHandler {
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var running = true
    private var audioHandler: AudioHandler?

    init() {
        // Initialize AudioHandler with reference to self
        audioHandler = AudioHandler(messageHandler: self)
    }

    func start() {
        // Setup signal handlers
        signal(SIGINT, SIG_IGN)
        signal(SIGTERM, SIG_IGN)

        let sigintSource = DispatchSource.makeSignalSource(
            signal: SIGINT,
            queue: .main
        )
        sigintSource.setEventHandler { [weak self] in
            self?.shutdown()
        }
        sigintSource.resume()

        let sigtermSource = DispatchSource.makeSignalSource(
            signal: SIGTERM,
            queue: .main
        )
        sigtermSource.setEventHandler { [weak self] in
            self?.shutdown()
        }
        sigtermSource.resume()

        // Send ready message
        sendEvent("ready", params: [:])

        // Read loop
        while running {
            guard let line = readLine() else {
                break
            }

            handleMessage(line)
        }
    }

    private func handleMessage(_ line: String) {
        guard let data = line.data(using: .utf8) else {
            logError("Failed to decode line as UTF-8")
            return
        }

        do {
            let message = try decoder.decode(IPCMessage.self, from: data)

            switch message.type {
            case .request:
                handleRequest(message)
            case .event:
                // Events from Electron (rare)
                break
            default:
                logError("Unexpected message type: \(message.type)")
            }
        } catch {
            logError("Failed to parse message: \(error)")
        }
    }

    private func handleRequest(_ message: IPCMessage) {
        guard let method = message.method else {
            sendError(id: message.id, code: "INVALID_REQUEST", message: "Missing method")
            return
        }

        switch method {
        case "ping":
            sendResponse(id: message.id, result: ["status": "ok"])
        case "health":
            sendResponse(id: message.id, result: [
                "status": "healthy",
                "uptime": ProcessInfo.processInfo.systemUptime
            ])
        case "start_recording":
            handleStartRecording(id: message.id)
        case "stop_recording":
            handleStopRecording(id: message.id)
        case "cancel_recording":
            handleCancelRecording(id: message.id)
        case "get_recording_state":
            handleGetRecordingState(id: message.id)
        default:
            sendError(id: message.id, code: "METHOD_NOT_FOUND", message: "Unknown method: \(method)")
        }
    }

    // MARK: - Audio Handler Methods

    private func handleStartRecording(id: String) {
        Task {
            do {
                try await audioHandler?.startRecording()
                sendResponse(id: id, result: ["status": "recording"])
            } catch let error as AudioHandlerError {
                sendError(id: id, code: "AUDIO_ERROR", message: error.localizedDescription)
            } catch {
                sendError(id: id, code: "UNKNOWN_ERROR", message: error.localizedDescription)
            }
        }
    }

    private func handleStopRecording(id: String) {
        Task {
            do {
                let finalText = try await audioHandler?.stopRecording() ?? ""
                sendResponse(id: id, result: [
                    "status": "stopped",
                    "final_text": finalText
                ])
            } catch let error as AudioHandlerError {
                sendError(id: id, code: "AUDIO_ERROR", message: error.localizedDescription)
            } catch {
                sendError(id: id, code: "UNKNOWN_ERROR", message: error.localizedDescription)
            }
        }
    }

    private func handleCancelRecording(id: String) {
        Task {
            await audioHandler?.cancelRecording()
            sendResponse(id: id, result: ["status": "cancelled"])
        }
    }

    private func handleGetRecordingState(id: String) {
        if let state = audioHandler?.getRecordingState() {
            sendResponse(id: id, result: state)
        } else {
            sendError(id: id, code: "AUDIO_ERROR", message: "AudioHandler not initialized")
        }
    }

    func sendResponse(id: String, result: [String: Any]) {
        let message = IPCMessage(
            id: id,
            type: .response,
            method: nil,
            params: nil,
            result: AnyCodable(result),
            error: nil
        )
        sendMessage(message)
    }

    func sendEvent(_ event: String, params: [String: Any]) {
        let message = IPCMessage(
            id: UUID().uuidString,
            type: .event,
            method: event,
            params: params.mapValues { AnyCodable($0) },
            result: nil,
            error: nil
        )
        sendMessage(message)
    }

    func sendError(id: String, code: String, message: String) {
        let msg = IPCMessage(
            id: id,
            type: .error,
            method: nil,
            params: nil,
            result: nil,
            error: IPCMessage.IPCError(code: code, message: message)
        )
        sendMessage(msg)
    }

    private func sendMessage(_ message: IPCMessage) {
        do {
            let data = try encoder.encode(message)
            if let json = String(data: data, encoding: .utf8) {
                print(json)
                fflush(stdout)
            }
        } catch {
            logError("Failed to encode message: \(error)")
        }
    }

    private func logError(_ message: String) {
        fputs("\(message)\n", stderr)
        fflush(stderr)
    }

    private func shutdown() {
        running = false
        sendEvent("shutdown", params: [:])
        exit(0)
    }
}
