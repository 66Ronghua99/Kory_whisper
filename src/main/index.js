/**
 * Deps: electron, node-global-key-listener
 * Used By: main process entry
 * Last Updated: 2024-03-04
 *
 * Kory Whisper - 主进程入口
 * 负责初始化应用、管理生命周期、协调各模块
 */

const { app, ipcMain, dialog } = require('electron');
const path = require('path');
const logger = require('./logger');
const ShortcutManager = require('./shortcut-manager');
const AudioRecorder = require('./audio-recorder');
const WhisperEngine = require('./whisper-engine');
const InputSimulator = require('./input-simulator');
const TrayManager = require('./tray-manager');
const ConfigManager = require('./config-manager');
const ModelDownloader = require('./model-downloader');

class KoryWhisperApp {
  constructor() {
    this.configManager = new ConfigManager();
    this.modelDownloader = null;  // 延迟到 init() 中初始化
    this.shortcutManager = null;
    this.audioRecorder = null;
    this.whisperEngine = null;
    this.inputSimulator = null;
    this.trayManager = null;
    this.isRecording = false;
  }

  async init() {
    // 初始化日志
    await logger.init();
    logger.info('[Main] ==================== Kory Whisper Starting ====================');
    logger.info('[Main] App version:', app.getVersion());
    logger.info('[Main] Electron version:', process.versions.electron);
    logger.info('[Main] Node version:', process.versions.node);
    logger.info('[Main] Platform:', process.platform, process.arch);
    logger.info('[Main] Is packaged:', app.isPackaged);
    logger.info('[Main] App path:', app.getAppPath());
    logger.info('[Main] Resources path:', process.resourcesPath);

    // 等待应用就绪
    await app.whenReady();
    logger.info('[Main] App is ready');

    // 获取正确的模型目录（打包后路径不同）
    const modelsDir = this.getModelsDir();
    logger.info('[Main] Models directory:', modelsDir);

    // 重新初始化 ModelDownloader 使用正确的路径
    this.modelDownloader = new ModelDownloader({ modelsDir });

    // 检查并下载模型
    logger.info('[Main] Checking model...');
    const modelReady = await this.checkAndDownloadModel();
    if (!modelReady) {
      logger.error('[Main] Model not ready, exiting...');
      return;
    }
    logger.info('[Main] Model is ready');

    // 初始化配置
    await this.configManager.load();
    const config = this.configManager.get();

    // 获取正确的模型路径（打包后路径不同）
    const modelPath = path.join(this.getModelsDir(), 'ggml-base.bin');

    // 初始化各模块
    this.audioRecorder = new AudioRecorder({
      sampleRate: 16000,
      channels: 1
    });

    this.whisperEngine = new WhisperEngine({
      modelPath: modelPath,
      vocabPath: config.vocabulary?.path,
      language: config.whisper?.language || 'zh',
      whisperBin: this.getWhisperBinPath()
    });

    this.inputSimulator = new InputSimulator();

    // 初始化托盘（在快捷键之前，确保有 UI 反馈）
    logger.info('[Main] Initializing tray manager...');
    this.trayManager = new TrayManager();
    this.trayManager.init();
    logger.info('[Main] Tray manager initialized');

    // 延迟初始化快捷键，避免启动时卡死
    // 快捷键需要辅助功能权限，如果没权限会提示用户
    logger.info('[Main] Will initialize shortcut manager in 1s...');
    setTimeout(() => {
      this.initShortcutManager(config);
    }, 1000);

    // 设置事件监听
    this.setupEventHandlers();

    // 检查权限
    await this.checkPermissions();

    logger.info('[Main] Initialization complete');
    logger.info('[Main] ==================== Kory Whisper Ready ====================');
  }

  initShortcutManager(config) {
    logger.info('[Main] Initializing shortcut manager...');
    logger.info('[Main] Shortcut key:', config.shortcut?.key || 'RIGHT COMMAND');
    try {
      this.shortcutManager = new ShortcutManager({
        key: config.shortcut?.key || 'RIGHT COMMAND',
        longPressDuration: config.shortcut?.longPressDuration || 500
      });
      this.shortcutManager.init();

      // 设置快捷键事件监听
      this.setupShortcutEventHandlers();

      logger.info('[Main] Shortcut manager initialized successfully');
    } catch (error) {
      logger.error('[Main] Failed to initialize shortcut manager:', error);
      dialog.showMessageBox({
        type: 'warning',
        title: '快捷键初始化失败',
        message: '无法初始化全局快捷键',
        detail: '请检查辅助功能权限是否已授予。\n' + error.message
      });
    }
  }

  setupShortcutEventHandlers() {
    logger.info('[Main] Setting up shortcut event handlers...');
    // 长按开始 - 开始录音
    this.shortcutManager.on('longPressStart', async () => {
      logger.info('[Main] Long press started - recording...');
      this.isRecording = true;
      this.trayManager.setRecordingState(true);

      try {
        await this.audioRecorder.start();
      } catch (error) {
        console.error('[Main] Failed to start recording:', error);
        this.isRecording = false;
        this.trayManager.setRecordingState(false);
      }
    });

    // 长按结束 - 停止录音并开始识别
    this.shortcutManager.on('longPressEnd', async () => {
      console.log('[Main] Long press ended - processing...');
      if (!this.isRecording) return;

      this.isRecording = false;
      this.trayManager.setRecordingState(false);
      this.trayManager.showProcessingState();

      try {
        // 停止录音
        const audioPath = await this.audioRecorder.stop();
        console.log('[Main] Audio saved to:', audioPath);

        // Whisper 识别
        const text = await this.whisperEngine.transcribe(audioPath);
        console.log('[Main] Transcribed:', text);

        if (text && text.trim()) {
          // 模拟键盘输入
          await this.inputSimulator.typeText(text);
          this.trayManager.showSuccessState();
        } else {
          this.trayManager.showErrorState('未识别到语音');
        }
      } catch (error) {
        console.error('[Main] Processing error:', error);
        this.trayManager.showErrorState(error.message);
      }
    });
  }

  getWhisperBinPath() {
    const isPackaged = app.isPackaged;
    if (isPackaged) {
      return path.join(process.resourcesPath, 'bin', 'whisper-cli');
    }
    return path.join(__dirname, '../../bin/whisper-cli');
  }

  getModelsDir() {
    const isPackaged = app.isPackaged;
    return isPackaged
      ? path.join(process.resourcesPath, 'models')
      : path.join(__dirname, '../../models');
  }

  async checkAndDownloadModel() {
    const modelCheck = await this.modelDownloader.checkModel('ggml-base.bin');

    if (modelCheck.exists && modelCheck.size > 140000000) {
      console.log('[Main] Model already exists:', modelCheck.path);
      return true;
    }

    // 显示下载对话框
    const result = await dialog.showMessageBox({
      type: 'info',
      buttons: ['下载模型', '退出'],
      defaultId: 0,
      title: '需要下载语音模型',
      message: '首次使用需要下载 Whisper 语音模型',
      detail: '模型大小: 约 75MB (ggml-base)\n下载后下次启动无需再次下载。'
    });

    if (result.response !== 0) {
      return false;
    }

    // 创建下载进度窗口
    const { BrowserWindow } = require('electron');
    const progressWin = new BrowserWindow({
      width: 400,
      height: 150,
      title: '下载模型中...',
      resizable: false,
      minimizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    progressWin.loadURL(`data:text/html,
      <html>
      <body style="font-family: -apple-system; text-align: center; padding: 30px;">
        <h3>正在下载语音模型...</h3>
        <p id="progress">0%</p>
        <p style="font-size: 12px; color: #666;">模型大小: 约 75MB</p>
      </body>
      <script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('progress', (e, p) => {
          document.getElementById('progress').textContent = p + '%';
        });
      </script>
      </html>
    `);

    try {
      await this.modelDownloader.downloadModel('ggml-base.bin', (progress) => {
        progressWin.webContents.send('progress', progress);
      });

      progressWin.close();
      return true;
    } catch (error) {
      progressWin.close();
      await dialog.showErrorBox('下载失败', '模型下载失败，请检查网络连接。\n' + error.message);
      return false;
    }
  }

  setupEventHandlers() {
    logger.info('[Main] Setting up event handlers...');

    // IPC 通信
    ipcMain.handle('get-config', () => this.configManager.get());
    ipcMain.handle('save-config', (event, config) => this.configManager.save(config));
    ipcMain.handle('open-vocab-editor', () => this.openVocabEditor());
    ipcMain.handle('get-logs', async () => {
      const loggerModule = require('./logger');
      return await loggerModule.getRecentLogs(200);
    });
    ipcMain.handle('open-logs', () => {
      const { shell } = require('electron');
      const loggerModule = require('./logger');
      shell.openPath(loggerModule.getLogPath());
    });

    // 托盘菜单事件
    this.trayManager.on('show-settings', () => this.trayManager.openSettings());
    this.trayManager.on('quit', () => app.quit());

    logger.info('[Main] Event handlers set up');
  }

  async checkPermissions() {
    const { systemPreferences } = require('electron');

    // 1. 检查麦克风权限
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    logger.info('[Main] Microphone permission status:', micStatus);

    if (micStatus !== 'granted') {
      logger.info('[Main] Requesting microphone permission...');
      // 主动请求麦克风权限
      const granted = await systemPreferences.askForMediaAccess('microphone');
      if (!granted) {
        await dialog.showMessageBox({
          type: 'warning',
          buttons: ['去设置', '稍后'],
          defaultId: 0,
          title: '需要麦克风权限',
          message: 'Kory Whisper 需要麦克风权限来录制语音',
          detail: '请点击"去设置"打开系统偏好设置，在"麦克风"中勾选 Kory Whisper'
        });
      }
    }

    // 2. 检查辅助功能权限
    const accessibilityEnabled = systemPreferences.isTrustedAccessibilityClient(false);

    if (!accessibilityEnabled) {
      logger.warn('[Main] Accessibility permission not granted');
      const result = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['去设置', '稍后'],
        defaultId: 0,
        title: '需要辅助功能权限',
        message: 'Kory Whisper 需要辅助功能权限来模拟键盘输入',
        detail: '请点击"去设置"打开系统偏好设置，在"辅助功能"中勾选 Kory Whisper'
      });

      if (result.response === 0) {
        systemPreferences.openSystemPreferences('security', 'Privacy_Accessibility');
      }
    }
  }

  openVocabEditor() {
    // 打开词表文件
    const { shell } = require('electron');
    const vocabPath = this.configManager.getVocabPath();
    shell.openPath(vocabPath);
  }
}

// 应用生命周期
const koryApp = new KoryWhisperApp();

app.on('ready', () => koryApp.init());

app.on('window-all-closed', (e) => {
  // Menubar 应用保持运行
  e.preventDefault();
});

app.on('activate', () => {
  // macOS 点击 dock 图标时恢复
});

app.on('will-quit', () => {
  // 清理资源
  if (koryApp.shortcutManager) {
    koryApp.shortcutManager.destroy();
  }
});

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
