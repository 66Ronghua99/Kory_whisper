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
    this.permissionContract = options.permissionContract || {};
    this.logger = options.logger || console;
    this.isRecording = false;
  }

  async handleShortcutStart() {
    this.logger.info('[Main] Long press started - recording...');

    const readiness = await this.loadReadiness();
    if (!readiness.isReady) {
      const blockedSurface = this.getBlockedSurface(readiness);
      if (await this.tryValidateInputMonitoring(readiness, blockedSurface)) {
        return;
      }

      this.isRecording = false;

      if (this.trayService && typeof this.trayService.showPermissionBlocked === 'function') {
        this.trayService.showPermissionBlocked(readiness);
      }

      if (this.trayService && typeof this.trayService.setRecording === 'function') {
        this.trayService.setRecording(false);
      }

      const blockedMessage = this.getBlockedMessage(readiness, blockedSurface);
      this.trayService.showError(blockedMessage);
      this.openBlockedRepairSurface(readiness, blockedSurface);
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

  async loadReadiness() {
    try {
      return await this.permissionService.getReadiness();
    } catch (error) {
      this.logger.error('[Main] Failed to read permission readiness:', error);
      return {
        isReady: false,
        firstRunNeedsOnboarding: false,
        refreshedAt: new Date().toISOString(),
        surfaces: {
          microphone: {
            status: 'unknown',
            reason: 'readiness-check-failed',
            cta: 'open-settings-and-recheck',
            settingsTarget: 'microphone'
          },
          accessibility: {
            status: 'unknown',
            reason: 'readiness-check-failed',
            cta: 'open-settings-and-recheck',
            settingsTarget: 'accessibility'
          },
          inputMonitoring: {
            status: 'unknown',
            reason: 'readiness-check-failed',
            cta: 'open-settings-and-recheck',
            settingsTarget: 'input-monitoring'
          }
        }
      };
    }
  }

  getBlockedSurface(readiness) {
    const surfaceOrder = Array.isArray(readiness.surfaceOrder) && readiness.surfaceOrder.length > 0
      ? readiness.surfaceOrder
      : ['microphone', 'accessibility', 'inputMonitoring'];

    for (const surfaceName of surfaceOrder) {
      const surface = readiness && readiness.surfaces && readiness.surfaces[surfaceName];
      if (!surface || surface.status === 'granted' || surface.status === 'unsupported') {
        continue;
      }

      return {
        surfaceName,
        ...surface,
        settingsTarget: surface.settingsTarget || surfaceName
      };
    }

    return null;
  }

  getBlockedMessage(readiness, blockedSurface) {
    const surfaceLabel = this.getReadableSurfaceLabel(blockedSurface && blockedSurface.surfaceName);

    const surfaceLabelText = surfaceLabel || (blockedSurface ? blockedSurface.surfaceName : '权限');
    return `语音输入当前不可用，请先开启${surfaceLabelText}权限`;
  }

  getReadableSurfaceLabel(surfaceName) {
    const fallbackLabels = {
      microphone: '麦克风',
      accessibility: '辅助功能',
      inputMonitoring: '输入监控'
    };

    if (!surfaceName || !this.permissionContract || !this.permissionContract.permission) {
      return fallbackLabels[surfaceName];
    }

    const contractSurface = Array.isArray(this.permissionContract.permission.surfaces)
      ? this.permissionContract.permission.surfaces.find((surface) => surface.key === surfaceName)
      : null;

    return (contractSurface && (contractSurface.onboardingLabel || contractSurface.label || contractSurface.menuLabel))
      || fallbackLabels[surfaceName];
  }

  async tryValidateInputMonitoring(readiness, blockedSurface) {
    if (!this.shouldUseShortcutForInputMonitoringValidation(readiness, blockedSurface)) {
      return false;
    }

    if (!this.permissionService || typeof this.permissionService.setRuntimeSurfaceStatus !== 'function') {
      return false;
    }

    this.permissionService.setRuntimeSurfaceStatus('inputMonitoring', 'granted');
    const validatedReadiness = await this.loadReadiness();

    if (this.trayService && typeof this.trayService.setPermissionReadiness === 'function') {
      this.trayService.setPermissionReadiness(validatedReadiness);
    }

    return true;
  }

  shouldUseShortcutForInputMonitoringValidation(readiness, blockedSurface) {
    if (!blockedSurface || blockedSurface.surfaceName !== 'inputMonitoring' || blockedSurface.status !== 'unknown') {
      return false;
    }

    return readiness
      && readiness.surfaces
      && readiness.surfaces.microphone
      && readiness.surfaces.microphone.status === 'granted'
      && readiness.surfaces.accessibility
      && readiness.surfaces.accessibility.status === 'granted';
  }

  openBlockedRepairSurface(readiness, blockedSurface) {
    if (blockedSurface && this.permissionService && typeof this.permissionService.openSettings === 'function') {
      this.permissionService.openSettings(blockedSurface.settingsTarget);
      return;
    }

    if (readiness && readiness.firstRunNeedsOnboarding) {
      if (this.trayService && typeof this.trayService.openPermissionOnboarding === 'function') {
        this.trayService.openPermissionOnboarding();
      }
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
