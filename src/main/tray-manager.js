/**
 * Deps: electron, path
 * Used By: index.js
 * Last Updated: 2026-03-05
 *
 * 菜单栏管理器 - 管理系统托盘图标和菜单
 */

const { Tray, Menu, nativeImage, BrowserWindow } = require('electron');
const path = require('path');
const { EventEmitter } = require('events');

class TrayManager extends EventEmitter {
  constructor() {
    super();
    this.tray = null;
    this.settingsWindow = null;
    this.onboardingWindow = null;
    this.currentState = 'idle'; // idle, recording, processing, success, error
    this.permissionReadiness = null;
    this.resetTimer = null;
  }

  init() {
    // 创建托盘图标
    const iconPath = path.join(__dirname, '../../assets/iconTemplate.png');
    console.log('[Tray] Icon path:', iconPath);

    let icon = nativeImage.createFromPath(iconPath);
    console.log('[Tray] Icon isEmpty:', icon.isEmpty());
    console.log('[Tray] Icon size:', icon.getSize());

    // 如果图标加载失败，尝试使用备用路径
    if (icon.isEmpty()) {
      console.log('[Tray] Trying alternate paths...');
      const { app } = require('electron');
      const altPath = path.join(app.getAppPath(), 'assets', 'iconTemplate.png');
      console.log('[Tray] Alt path:', altPath);
      icon = nativeImage.createFromPath(altPath);
      console.log('[Tray] Alt icon isEmpty:', icon.isEmpty());
    }

    // 如果没有图标文件，使用默认
    if (icon.isEmpty()) {
      console.log('[Tray] Using default icon');
      icon = this.createDefaultIcon();
    }

    this.tray = new Tray(icon);
    this.applyStateVisuals();
    this.updateContextMenu();

    // 点击图标显示设置
    this.tray.on('click', () => {
      this.openSettings();
    });

    console.log('[Tray] Tray initialized successfully');
  }

  createDefaultIcon() {
    // 创建一个简单的默认图标（16x16）
    const size = { width: 16, height: 16 };
    const image = nativeImage.createEmpty();
    // 使用系统默认模板图标
    return image;
  }

  updateContextMenu() {
    if (!this.tray) {
      return;
    }

    const template = this.buildMenuTemplate();

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  getStateLabel() {
    const labels = {
      idle: '就绪',
      recording: '录音中...',
      processing: '识别中...',
      success: '已复制到剪贴板',
      error: '错误'
    };
    return labels[this.currentState] || '未知';
  }

  setPermissionReadiness(readiness) {
    this.permissionReadiness = readiness || null;
    this.applyStateVisuals();
    this.updateContextMenu();
    this.pushPermissionReadinessToWindows();
  }

  showPermissionBlocked(readiness) {
    this.setPermissionReadiness(readiness);
  }

  openPermissionOnboarding() {
    this.emit('open-permission-onboarding');
  }

  recheckPermissionReadiness() {
    this.emit('recheck-permission-readiness');
  }

  openPermissionSettings(surface) {
    this.emit('open-permission-settings', surface);
  }

  getReadinessLabel() {
    if (!this.permissionReadiness) {
      return null;
    }

    return this.permissionReadiness.isReady ? 'Ready' : 'Not Ready';
  }

  getReadableSurfaceName(surfaceName) {
    const names = {
      microphone: 'Microphone',
      accessibility: 'Accessibility',
      inputMonitoring: 'Input Monitoring'
    };

    return names[surfaceName] || surfaceName;
  }

  getBlockedSurfaces() {
    if (!this.permissionReadiness || this.permissionReadiness.isReady) {
      return [];
    }

    return Object.entries(this.permissionReadiness.surfaces || {})
      .filter(([, surface]) => surface && surface.status !== 'granted' && surface.status !== 'unsupported')
      .map(([surfaceName, surface]) => ({
        surfaceName,
        label: this.getReadableSurfaceName(surfaceName),
        status: surface.status || 'unknown',
        settingsTarget: surface.settingsTarget || surfaceName
      }));
  }

  getBlockedSurfaceStatusLabel(status) {
    const labels = {
      missing: 'Missing',
      unknown: 'Unknown'
    };

    return labels[status] || status;
  }

  buildMenuTemplate() {
    const template = [];
    const readinessLabel = this.getReadinessLabel();

    if (readinessLabel) {
      template.push({
        label: readinessLabel,
        enabled: false
      });

      template.push({
        label: 'Kory Whisper',
        enabled: false
      });
    } else {
      template.push({
        label: 'Kory Whisper',
        enabled: false
      });
    }

    const currentStateLabel = this.getStateLabel();
    const transientVisible = this.currentState !== 'idle';

    if (transientVisible) {
      template.push({ type: 'separator' });
      template.push({
        label: '状态: ' + currentStateLabel,
        enabled: false
      });
    }

    const blockedSurfaces = this.getBlockedSurfaces();

    if (blockedSurfaces.length > 0) {
      template.push({ type: 'separator' });
      template.push({
        label: '语音输入在完成设置前不可用',
        enabled: false
      });
      template.push({
        label: '请完成权限设置后再继续',
        enabled: false
      });
      blockedSurfaces.forEach((surface) => {
        template.push({
          label: `${surface.label}: ${this.getBlockedSurfaceStatusLabel(surface.status)}`,
          enabled: false
        });
      });
      template.push({ type: 'separator' });
      template.push({
        label: 'Open Permission Setup',
        click: () => this.openPermissionOnboarding()
      });
      template.push({
        label: 'Re-check Permissions',
        click: () => this.recheckPermissionReadiness()
      });
      blockedSurfaces.forEach((surface) => {
        template.push({
          label: `Open ${surface.label} Settings`,
          click: () => this.openPermissionSettings(surface.settingsTarget)
        });
      });
      template.push({ type: 'separator' });
    } else if (!transientVisible && !readinessLabel) {
      template.push({ type: 'separator' });
      template.push({
        label: '状态: ' + currentStateLabel,
        enabled: false
      });
      template.push({ type: 'separator' });
    }

    template.push({
      label: '设置',
      click: () => this.openSettings()
    });
    template.push({
      label: '编辑词表',
      click: () => this.emit('open-vocab')
    });
    template.push({ type: 'separator' });
    template.push({
      label: '退出',
      click: () => this.emit('quit')
    });

    return template;
  }

  clearResetTimer() {
    if (!this.resetTimer) {
      return;
    }

    clearTimeout(this.resetTimer);
    this.resetTimer = null;
  }

  scheduleResetToIdle(delayMs) {
    this.clearResetTimer();
    this.resetTimer = setTimeout(() => {
      this.resetTimer = null;
      this.currentState = 'idle';
      this.applyStateVisuals();
      this.updateContextMenu();
    }, delayMs);
  }

  setRecordingState(isRecording) {
    this.clearResetTimer();
    this.currentState = isRecording ? 'recording' : 'idle';
    this.applyStateVisuals();
    this.updateContextMenu();
  }

  showProcessingState() {
    this.clearResetTimer();
    this.currentState = 'processing';
    this.applyStateVisuals();
    this.updateContextMenu();
  }

  showSuccessState() {
    this.clearResetTimer();
    this.currentState = 'success';
    this.applyStateVisuals();
    this.updateContextMenu();
    this.scheduleResetToIdle(2000);
  }

  showErrorState(message) {
    this.clearResetTimer();
    this.currentState = 'error';
    this.applyStateVisuals();
    this.updateContextMenu();

    console.error('[Tray] Error:', message);
    this.scheduleResetToIdle(3000);
  }

  applyStateVisuals() {
    if (!this.tray) return;

    const readinessLabel = this.getReadinessLabel();
    const visuals = {
      idle: readinessLabel === 'Not Ready'
        ? {
            title: '!',
            tooltip: 'Kory Whisper - Not Ready'
          }
        : { title: '', tooltip: 'Kory Whisper - 长按右 ⌘ 语音输入' },
      recording: { title: '●', tooltip: 'Kory Whisper - 录音中...' },
      processing: { title: '…', tooltip: 'Kory Whisper - 识别中...' },
      success: { title: '✓', tooltip: 'Kory Whisper - 已复制到剪贴板，请手动粘贴' },
      error: { title: '!', tooltip: 'Kory Whisper - 出错了' }
    };

    const stateVisual = visuals[this.currentState] || visuals.idle;
    this.tray.setTitle(stateVisual.title);
    this.tray.setToolTip(stateVisual.tooltip);
  }

  openSettings() {
    this.openManagedWindow('settingsWindow', {
      width: 560,
      height: 760,
      title: 'Kory Whisper 设置',
      fileName: 'settings.html'
    });
  }

  showPermissionOnboarding() {
    this.openManagedWindow('onboardingWindow', {
      width: 760,
      height: 860,
      title: 'Kory Whisper 权限引导',
      fileName: 'permission-onboarding.html'
    });
  }

  openManagedWindow(windowKey, options) {
    const existingWindow = this[windowKey];
    if (existingWindow && !existingWindow.isDestroyed()) {
      if (typeof existingWindow.show === 'function') {
        existingWindow.show();
      }
      if (typeof existingWindow.focus === 'function') {
        existingWindow.focus();
      }
      return existingWindow;
    }

    const managedWindow = new BrowserWindow({
      width: options.width,
      height: options.height,
      title: options.title,
      resizable: false,
      minimizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this[windowKey] = managedWindow;
    managedWindow.loadFile(path.join(__dirname, '../renderer', options.fileName));

    managedWindow.on('closed', () => {
      this[windowKey] = null;
    });

    return managedWindow;
  }

  pushPermissionReadinessToWindows() {
    if (!this.permissionReadiness) {
      return;
    }

    for (const windowInstance of [this.onboardingWindow]) {
      if (!windowInstance || windowInstance.isDestroyed()) {
        continue;
      }

      if (windowInstance.webContents && typeof windowInstance.webContents.send === 'function') {
        windowInstance.webContents.send('permission-readiness-updated', this.permissionReadiness);
      }
    }
  }

  destroy() {
    this.clearResetTimer();

    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.close();
    }

    if (this.onboardingWindow && !this.onboardingWindow.isDestroyed()) {
      this.onboardingWindow.close();
    }

    if (this.tray && typeof this.tray.destroy === 'function') {
      this.tray.destroy();
    }

    this.settingsWindow = null;
    this.onboardingWindow = null;
    this.tray = null;
  }
}

module.exports = TrayManager;
