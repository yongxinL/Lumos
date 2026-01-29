import Foundation
import AVFoundation
@preconcurrency import FluidAudio

enum AudioHandlerError: Error {
    case alreadyRecording
    case notRecording
    case microphonePermissionDenied
    case initializationFailed(String)
    case transcriptionFailed(String)
}

/// Encapsulates an active recording session
private struct RecordingSession {
    let manager: StreamingAsrManager
}

class AudioHandler {
    private var isRecording = false
    private var recordingSession: RecordingSession?
    private let messageHandler: MessageHandler

    init(messageHandler: MessageHandler) {
        self.messageHandler = messageHandler
    }

    // MARK: - Public Methods

    /// Start recording audio from microphone with streaming transcription
    func startRecording() async throws {
        guard !isRecording else {
            throw AudioHandlerError.alreadyRecording
        }

        // Check microphone permissions
        let permissionGranted = await checkMicrophonePermission()
        guard permissionGranted else {
            throw AudioHandlerError.microphonePermissionDenied
        }

        // Create new streaming manager for this session
        let streamingManager = StreamingAsrManager(config: .streaming)

        // Start the streaming manager
        do {
            try await streamingManager.start(source: .microphone)
            isRecording = true

            // Send recording started event
            messageHandler.sendEvent("recording_started", params: [:])

            // Store session for later
            recordingSession = RecordingSession(manager: streamingManager)

            // TODO: Real-time transcription updates require resolving actor isolation
            // See: https://github.com/FluidInference/FluidAudio/issues
            // For now, we only provide final transcription on stop
        } catch {
            throw AudioHandlerError.transcriptionFailed(error.localizedDescription)
        }
    }

    /// Stop recording and return final transcription
    func stopRecording() async throws -> String {
        guard isRecording else {
            throw AudioHandlerError.notRecording
        }

        guard let session = recordingSession else {
            throw AudioHandlerError.notRecording
        }

        // Get final transcription
        let finalText: String
        do {
            finalText = try await session.manager.finish()
        } catch {
            throw AudioHandlerError.transcriptionFailed(error.localizedDescription)
        }

        isRecording = false
        recordingSession = nil

        // Send recording stopped event with final transcription
        messageHandler.sendEvent("recording_stopped", params: [
            "final_text": finalText
        ])

        return finalText
    }

    /// Cancel recording without saving transcription
    func cancelRecording() async {
        recordingSession = nil
        isRecording = false

        // Send recording cancelled event
        messageHandler.sendEvent("recording_cancelled", params: [:])
    }

    /// Get current recording state
    func getRecordingState() -> [String: Any] {
        return [
            "is_recording": isRecording
        ]
    }

    // MARK: - Private Methods

    /// Check and request microphone permissions
    private func checkMicrophonePermission() async -> Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .audio)

        switch status {
        case .authorized:
            return true
        case .notDetermined:
            // Request permission
            return await AVCaptureDevice.requestAccess(for: .audio)
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }
}
