class PermissionGatewayDarwin {
  constructor(options = {}) {
    this.systemPreferences = options.systemPreferences || this.getElectronSystemPreferences();
    this.shell = options.shell || this.getElectronShell();
  }

  getElectronSystemPreferences() {
    const electron = require('electron');
    return electron.systemPreferences || null;
  }

  getElectronShell() {
    const electron = require('electron');
    return electron.shell || null;
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
      surfaces: {
        microphone: {
          granted: systemPreferences.getMediaAccessStatus('microphone') === 'granted',
          canRequest: typeof systemPreferences.askForMediaAccess === 'function'
        },
        accessibility: {
          granted: systemPreferences.isTrustedAccessibilityClient(false)
        },
        inputMonitoring: {
          status: 'unknown'
        }
      }
    };
  }

  async ensure() {
    const systemPreferences = this.requireSystemPreferences();
    const snapshot = await this.check();

    if (!snapshot.surfaces.microphone.granted && typeof systemPreferences.askForMediaAccess === 'function') {
      snapshot.surfaces.microphone.granted = await systemPreferences.askForMediaAccess('microphone');
    }

    return snapshot;
  }

  getSettingsRoute(surface) {
    if (surface === 'microphone') {
      return {
        deepLink: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
        pane: ['security', 'Privacy_Microphone']
      };
    }

    if (surface === 'input-monitoring') {
      return {
        deepLink: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent',
        pane: ['security', 'Privacy_ListenEvent']
      };
    }

    return {
      deepLink: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
      pane: ['security', 'Privacy_Accessibility']
    };
  }

  async openSettings(surface) {
    const systemPreferences = this.requireSystemPreferences();
    const route = this.getSettingsRoute(surface);

    if (this.shell && typeof this.shell.openExternal === 'function') {
      try {
        await this.shell.openExternal(route.deepLink);
        return;
      } catch {}
    }

    if (typeof systemPreferences.openSystemPreferences === 'function') {
      systemPreferences.openSystemPreferences(...route.pane);
    }
  }
}

module.exports = PermissionGatewayDarwin;
