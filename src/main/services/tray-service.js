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
    }
  }
}

module.exports = TrayService;
