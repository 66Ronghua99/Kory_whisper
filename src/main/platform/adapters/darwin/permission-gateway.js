class PermissionGatewayDarwin {
  constructor(options = {}) {
    this.systemPreferences = options.systemPreferences || this.getElectronSystemPreferences();
  }

  getElectronSystemPreferences() {
    const electron = require('electron');
    return electron.systemPreferences || null;
  }

  requireSystemPreferences() {
    if (!this.systemPreferences) {
      throw new Error('systemPreferences is unavailable');
    }

    return this.systemPreferences;
  }

  async check() {
    const systemPreferences = this.requireSystemPreferences();
    return {
      microphoneGranted: systemPreferences.getMediaAccessStatus('microphone') === 'granted',
      accessibilityEnabled: systemPreferences.isTrustedAccessibilityClient(false)
    };
  }

  async ensure() {
    const systemPreferences = this.requireSystemPreferences();
    let microphoneGranted = systemPreferences.getMediaAccessStatus('microphone') === 'granted';
    if (!microphoneGranted && typeof systemPreferences.askForMediaAccess === 'function') {
      microphoneGranted = await systemPreferences.askForMediaAccess('microphone');
    }

    let accessibilityEnabled = systemPreferences.isTrustedAccessibilityClient(false);
    if (!accessibilityEnabled) {
      systemPreferences.isTrustedAccessibilityClient(true);
      accessibilityEnabled = systemPreferences.isTrustedAccessibilityClient(false);
    }

    return {
      microphoneGranted,
      accessibilityEnabled
    };
  }

  openSettings(surface) {
    const systemPreferences = this.requireSystemPreferences();

    if (surface === 'microphone') {
      systemPreferences.openSystemPreferences('security', 'Privacy_Microphone');
      return;
    }

    if (surface === 'input-monitoring') {
      systemPreferences.openSystemPreferences('security', 'Privacy_ListenEvent');
      return;
    }

    systemPreferences.openSystemPreferences('security', 'Privacy_Accessibility');
  }
}

module.exports = PermissionGatewayDarwin;
