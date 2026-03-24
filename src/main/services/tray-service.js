class TrayService {
  constructor(options = {}) {
    this.trayManager = options.trayManager;
  }

  init() {
    return this.trayManager.init();
  }

  setRecording(isRecording) {
    return this.trayManager.setRecordingState(isRecording);
  }

  showProcessing() {
    return this.trayManager.showProcessingState();
  }

  showSuccess() {
    return this.trayManager.showSuccessState();
  }

  showError(message) {
    return this.trayManager.showErrorState(message);
  }

  setPermissionReadiness(readiness) {
    return this.trayManager.setPermissionReadiness(readiness);
  }

  showPermissionBlocked(readiness) {
    return this.trayManager.showPermissionBlocked(readiness);
  }

  openPermissionOnboarding() {
    return this.trayManager.openPermissionOnboarding();
  }

  recheckPermissionReadiness() {
    return this.trayManager.recheckPermissionReadiness();
  }

  openPermissionSettings(surface) {
    return this.trayManager.openPermissionSettings(surface);
  }

  openSettings() {
    return this.trayManager.openSettings();
  }

  on(eventName, handler) {
    this.trayManager.on(eventName, handler);
    return this;
  }

  dispose() {
    if (typeof this.trayManager.destroy === 'function') {
      this.trayManager.destroy();
      return;
    }

    if (typeof this.trayManager.dispose === 'function') {
      this.trayManager.dispose();
    }
  }
}

module.exports = TrayService;
