class PermissionService {
  constructor(options = {}) {
    this.permissionGateway = options.permissionGateway;
    this.dialog = options.dialog || null;
  }

  async check() {
    return this.permissionGateway.check();
  }

  async ensure() {
    return this.permissionGateway.ensure();
  }

  async ensureStartupPermissions() {
    const state = await this.ensure();

    if (!state.microphoneGranted) {
      await this.showMicrophoneWarning();
    }

    if (!state.accessibilityEnabled) {
      await this.showAccessibilityWarning();
    }

    return state;
  }

  async ensureMicrophoneAccess() {
    const state = await this.check();
    if (state.microphoneGranted) {
      return state;
    }

    const ensuredState = await this.ensure();
    if (!ensuredState.microphoneGranted) {
      await this.showMicrophoneWarning();
    }

    return ensuredState;
  }

  openSettings(surface) {
    if (typeof this.permissionGateway.openSettings === 'function') {
      this.permissionGateway.openSettings(surface);
    }
  }

  async showShortcutInitializationFailure(error, permissionState = {}) {
    if (!this.dialog || typeof this.dialog.showMessageBox !== 'function') {
      return;
    }

    const missingAccessibility = permissionState.accessibilityEnabled === false;
    await this.dialog.showMessageBox({
      type: 'warning',
      title: '快捷键初始化失败',
      message: '无法初始化全局快捷键。',
      detail: missingAccessibility
        ? `当前未检测到辅助功能权限。请同时确认“辅助功能”和“输入监控”已授权，并重启应用。\n${error.message}`
        : `请检查系统设置中的“辅助功能 / 输入监控”权限，并重启应用。\n${error.message}`
    });
  }

  async showMicrophoneWarning() {
    if (!this.dialog || typeof this.dialog.showMessageBox !== 'function') {
      return;
    }

    const result = await this.dialog.showMessageBox({
      type: 'warning',
      buttons: ['去设置', '稍后'],
      defaultId: 0,
      title: '需要麦克风权限',
      message: 'Kory Whisper 需要麦克风权限来录制语音。',
      detail: '请在系统设置中允许麦克风访问。'
    });

    if (result.response === 0) {
      this.openSettings('microphone');
    }
  }

  async showAccessibilityWarning() {
    if (!this.dialog || typeof this.dialog.showMessageBox !== 'function') {
      return;
    }

    const result = await this.dialog.showMessageBox({
      type: 'warning',
      buttons: ['辅助功能设置', '输入监控设置', '稍后'],
      defaultId: 0,
      cancelId: 2,
      title: '需要辅助功能权限',
      message: 'Kory Whisper 需要权限来监听按键并输入文本。',
      detail: '请在系统设置中确认“辅助功能”和“输入监控”已授权，修改后请重启应用。'
    });

    if (result.response === 0) {
      this.openSettings('accessibility');
    } else if (result.response === 1) {
      this.openSettings('input-monitoring');
    }
  }
}

module.exports = PermissionService;
