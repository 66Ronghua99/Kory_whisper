const {
  startRecordingFeedback,
  announceOutputReady
} = require('../dictation-feedback');

class DictationService {
  constructor(options = {}) {
    this.permissionService = options.permissionService;
    this.recordingService = options.recordingService;
    this.transcriptionService = options.transcriptionService;
    this.injectionService = options.injectionService;
    this.cueService = options.cueService;
    this.trayService = options.trayService;
    this.logger = options.logger || console;
    this.isRecording = false;
  }

  async handleShortcutStart() {
    this.logger.info('[Main] Long press started - recording...');

    const permissionState = await this.permissionService.ensureMicrophoneAccess();
    if (permissionState.microphoneGranted === false) {
      this.trayService.showError('麦克风权限被拒绝，请在系统设置中允许');
      this.permissionService.openSettings('microphone');
      return;
    }

    this.isRecording = true;

    try {
      await startRecordingFeedback({
        audioRecorder: this.recordingService,
        trayManager: {
          setRecordingState: (isRecording) => this.trayService.setRecording(isRecording)
        },
        audioCuePlayer: this.cueService,
        onAudioCueError: (error) => this.logger.error('[Main] Failed to play recording-start cue:', error)
      });
    } catch (error) {
      this.logger.error('[Main] Failed to start recording:', error);
      this.isRecording = false;
      this.trayService.setRecording(false);

      const errorMessage = error.message || '';
      if (errorMessage.includes('can not open audio device') || errorMessage.includes('audio device')) {
        this.trayService.showError('麦克风权限被拒绝，请在系统设置中允许');
        this.permissionService.openSettings('microphone');
        return;
      }

      this.trayService.showError(`录音启动失败: ${error.message}`);
    }
  }

  async handleShortcutEnd() {
    this.logger.info('[Main] Long press ended - processing...');
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;
    this.trayService.setRecording(false);
    this.trayService.showProcessing();

    try {
      const audioPath = await this.recordingService.stop();
      const text = await this.transcriptionService.transcribe(audioPath);

      if (text && text.trim()) {
        await this.injectionService.deliverText(text);
        await announceOutputReady({
          trayManager: {
            showSuccessState: () => this.trayService.showSuccess()
          },
          audioCuePlayer: this.cueService,
          onAudioCueError: (error) => this.logger.error('[Main] Failed to play output-ready cue:', error)
        });
        return;
      }

      this.trayService.showError('未识别到语音');
    } catch (error) {
      this.logger.error('[Main] Processing error:', error);
      this.trayService.showError(error.message);
    }
  }
}

module.exports = DictationService;
