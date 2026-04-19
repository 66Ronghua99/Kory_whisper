class PermissionGatewayWin32 {
  constructor(options = {}) {
    this.systemPreferences = options.systemPreferences || this.getElectronSystemPreferences();
    this.shell = options.shell || this.getElectronShell();
  }

  getElectronSystemPreferences() {
    try {
      const electron = require('electron');
      return electron.systemPreferences || null;
    } catch {
      return null;
    }
  }

  getElectronShell() {
    try {
      const electron = require('electron');
      return electron.shell || null;
    } catch {
      return null;
    }
  }

  requireSystemPreferences() {
    if (!this.systemPreferences || typeof this.systemPreferences.getMediaAccessStatus !== 'function') {
      throw new Error('systemPreferences.getMediaAccessStatus is unavailable');
    }

    return this.systemPreferences;
  }

  async check() {
    const systemPreferences = this.requireSystemPreferences();
    const microphoneGranted = systemPreferences.getMediaAccessStatus('microphone') === 'granted';

    return {
      microphoneGranted,
      accessibilityEnabled: true,
      guidanceSurfaces: this.getGuidanceSurfaces({
        microphoneGranted
      }),
      guidance: microphoneGranted ? [] : [this.getMicrophoneGuidance()]
    };
  }

  async ensure() {
    return this.check();
  }

  getGuidanceSurfaces(state = {}) {
    if (state.microphoneGranted === false) {
      return ['microphone'];
    }

    return [];
  }

  getMicrophoneGuidance() {
    return Object.freeze({
      surface: 'microphone',
      title: 'Enable microphone access',
      detail: 'Open Windows microphone privacy settings.',
      settingsUri: 'ms-settings:privacy-microphone'
    });
  }

  openSettings(surface) {
    if (surface !== 'microphone') {
      return undefined;
    }

    const settingsUri = 'ms-settings:privacy-microphone';
    if (this.shell && typeof this.shell.openExternal === 'function') {
      this.shell.openExternal(settingsUri);
    }

    return settingsUri;
  }
}

module.exports = PermissionGatewayWin32;
