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
    this.currentState = 'idle'; // idle, recording, processing, success, error
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
    const template = [
      {
        label: 'Kory Whisper',
        enabled: false
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => this.openSettings()
      },
      {
        label: '编辑词表',
        click: () => this.emit('open-vocab')
      },
      { type: 'separator' },
      {
        label: '状态: ' + this.getStateLabel(),
        enabled: false
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => this.emit('quit')
      }
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  getStateLabel() {
    const labels = {
      idle: '就绪',
      recording: '录音中...',
      processing: '识别中...',
      success: '完成',
      error: '错误'
    };
    return labels[this.currentState] || '未知';
  }

  setRecordingState(isRecording) {
    this.currentState = isRecording ? 'recording' : 'idle';
    this.applyStateVisuals();
    this.updateContextMenu();
  }

  showProcessingState() {
    this.currentState = 'processing';
    this.applyStateVisuals();
    this.updateContextMenu();
  }

  showSuccessState() {
    this.currentState = 'success';
    this.applyStateVisuals();
    this.updateContextMenu();

    // 2秒后恢复
    setTimeout(() => {
      this.currentState = 'idle';
      this.applyStateVisuals();
      this.updateContextMenu();
    }, 2000);
  }

  showErrorState(message) {
    this.currentState = 'error';
    this.applyStateVisuals();
    this.updateContextMenu();

    console.error('[Tray] Error:', message);

    // 3秒后恢复
    setTimeout(() => {
      this.currentState = 'idle';
      this.applyStateVisuals();
      this.updateContextMenu();
    }, 3000);
  }

  applyStateVisuals() {
    if (!this.tray) return;

    const visuals = {
      idle: { title: '', tooltip: 'Kory Whisper - 长按右 ⌘ 语音输入' },
      recording: { title: '●', tooltip: 'Kory Whisper - 录音中...' },
      processing: { title: '…', tooltip: 'Kory Whisper - 识别中...' },
      success: { title: '✓', tooltip: 'Kory Whisper - 输入完成' },
      error: { title: '!', tooltip: 'Kory Whisper - 出错了' }
    };

    const stateVisual = visuals[this.currentState] || visuals.idle;
    this.tray.setTitle(stateVisual.title);
    this.tray.setToolTip(stateVisual.tooltip);
  }

  openSettings() {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 500,
      height: 400,
      title: 'Kory Whisper 设置',
      resizable: false,
      minimizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }
}

module.exports = TrayManager;
