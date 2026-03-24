const buildPermissionReadiness = require('./permission-readiness.js');

class PermissionService {
  constructor(options = {}) {
    this.permissionGateway = options.permissionGateway;
    this.dialog = options.dialog || null;
    this.runtimeSurfaceStatuses = {};
    this.permissionContract = options.permissionContract || null;
  }

  getPermissionContractPayload() {
    const contract = this.permissionContract || {};
    return contract && typeof contract === 'object' && contract.permission
      ? contract.permission
      : contract;
  }

  async check() {
    return this.getReadiness();
  }

  async ensure() {
    return this.recheckReadiness();
  }

  async getReadiness() {
    const rawFacts = await this.permissionGateway.check();
    return this.applyRuntimeOverrides(this.getContractedReadiness(rawFacts));
  }

  async recheckReadiness() {
    if (typeof this.permissionGateway.recheckReadiness === 'function') {
      return this.applyRuntimeOverrides(this.getContractedReadiness(await this.permissionGateway.recheckReadiness()));
    }

    return this.getReadiness();
  }

  getContractedReadiness(rawFacts = {}) {
    if (typeof buildPermissionReadiness.buildPermissionReadinessWithContract === 'function') {
      return buildPermissionReadiness.buildPermissionReadinessWithContract(
        rawFacts,
        this.getPermissionContractPayload()
      );
    }

    return buildPermissionReadiness(rawFacts);
  }

  getPermissionContract() {
    return this.permissionContract || {};
  }

  setRuntimeSurfaceStatus(surfaceName, status) {
    if (!surfaceName) {
      return;
    }

    this.runtimeSurfaceStatuses[surfaceName] = status;
  }

  applyRuntimeOverrides(readiness) {
    if (!readiness || !readiness.surfaces) {
      return readiness;
    }

    const nextSurfaces = { ...readiness.surfaces };
    let changed = false;

    for (const [surfaceName, status] of Object.entries(this.runtimeSurfaceStatuses)) {
      if (!nextSurfaces[surfaceName] || !status) {
        continue;
      }

      if (nextSurfaces[surfaceName].status === status) {
        continue;
      }

      nextSurfaces[surfaceName] = {
        ...nextSurfaces[surfaceName],
        status
      };
      changed = true;
    }

    if (!changed) {
      return readiness;
    }

    const isReady = Object.values(nextSurfaces).every((surface) => surface.status === 'granted' || surface.status === 'unsupported');

    return {
      ...readiness,
      isReady,
      surfaces: nextSurfaces
    };
  }

  async ensureStartupPermissions() {
    const rawFacts = typeof this.permissionGateway.ensure === 'function'
      ? await this.permissionGateway.ensure()
      : await this.permissionGateway.check();
    const readiness = this.getContractedReadiness(rawFacts);

    if (readiness.isReady) {
      return readiness;
    }

    if (readiness.surfaces.microphone.status !== 'granted') {
      await this.showMicrophoneWarning();
    }

    if (readiness.surfaces.accessibility.status !== 'granted' || readiness.surfaces.inputMonitoring.status !== 'granted') {
      await this.showAccessibilityWarning();
    }

    return readiness;
  }

  async ensureMicrophoneAccess() {
    const readiness = await this.getReadiness();
    if (readiness.isReady) {
      return this.decorateLegacyReadiness(readiness);
    }

    const rawFacts = typeof this.permissionGateway.ensure === 'function'
      ? await this.permissionGateway.ensure()
      : await this.permissionGateway.check();
    const ensuredReadiness = this.getContractedReadiness(rawFacts);

    if (ensuredReadiness.surfaces.microphone.status !== 'granted') {
      await this.showMicrophoneWarning();
    }

    return this.decorateLegacyReadiness(ensuredReadiness);
  }

  decorateLegacyReadiness(readiness) {
    return {
      ...readiness,
      microphoneGranted: readiness.surfaces.microphone.status === 'granted',
      accessibilityEnabled: readiness.surfaces.accessibility.status === 'granted'
    };
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

    const accessibilityMissing = this.getSurfaceStatus(permissionState, 'accessibility') !== 'granted';
    const inputMonitoringMissing = this.getSurfaceStatus(permissionState, 'inputMonitoring') !== 'granted';
    await this.dialog.showMessageBox({
      type: 'warning',
      title: '快捷键初始化失败',
      message: '无法初始化全局快捷键。',
      detail: accessibilityMissing || inputMonitoringMissing
        ? `当前未检测到辅助功能或输入监控权限。请同时确认“辅助功能”和“输入监控”已授权，然后返回应用重新检查。\n${error.message}`
        : `请检查系统设置中的“辅助功能 / 输入监控”权限，然后返回应用重新检查。\n${error.message}`
    });
  }

  getSurfaceStatus(permissionState, surfaceName) {
    if (permissionState && permissionState.surfaces && permissionState.surfaces[surfaceName]) {
      return permissionState.surfaces[surfaceName].status;
    }

    if (surfaceName === 'accessibility' && permissionState.accessibilityEnabled === false) {
      return 'missing';
    }

    if (surfaceName === 'microphone' && permissionState.microphoneGranted === false) {
      return 'missing';
    }

    return 'missing';
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
      detail: '请在系统设置中确认“辅助功能”和“输入监控”已授权，然后返回应用重新检查。'
    });

    if (result.response === 0) {
      this.openSettings('accessibility');
    } else if (result.response === 1) {
      this.openSettings('input-monitoring');
    }
  }
}

module.exports = PermissionService;
