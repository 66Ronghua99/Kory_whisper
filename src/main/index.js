/**
 * Deps: electron, node-global-key-listener
 * Used By: main process entry
 * Last Updated: 2026-03-05
 *
 * Kory Whisper - 主进程入口
 * 负责初始化应用、管理生命周期、协调各模块
 */

const { app, ipcMain, dialog } = require('electron');
const logger = require('./logger');
const ShortcutManager = require('./shortcut-manager');
const platform = require('./platform');
const WhisperEngine = require('./whisper-engine');
const DebugCaptureStore = require('./debug-capture-store');
const TrayManager = require('./tray-manager');
const ConfigManager = require('./config-manager');
const ModelDownloader = require('./model-downloader');
const {
  startRecordingFeedback,
  announceOutputReady
} = require('./dictation-feedback');
const { createRuntimeEnv } = require('./runtime/runtime-env');
const { createRuntimePaths } = require('./runtime/runtime-paths');

class KoryWhisperApp {
  constructor() {
    this.configManager = new ConfigManager();
    this.modelDownloader = null;  // 延迟到 init() 中初始化
    this.shortcutManager = null;
    this.audioRecorder = null;
    this.whisperEngine = null;
    this.inputSimulator = null;
    this.audioCuePlayer = null;
    this.trayManager = null;
    this.isRecording = false;
    this.runtimeEnv = null;
    this.runtimePaths = null;
  }

  async init() {
    this.runtimeEnv = createRuntimeEnv({ app });
    this.runtimePaths = createRuntimePaths({ runtimeEnv: this.runtimeEnv });
    // 初始化日志
    await logger.init();
    logger.info('[Main] ==================== Kory Whisper Starting ====================');
    logger.info('[Main] App version:', app.getVersion());
    logger.info('[Main] Electron version:', process.versions.electron);
    logger.info('[Main] Node version:', process.versions.node);
    logger.info('[Main] Platform:', this.runtimeEnv.platform, this.runtimeEnv.arch);
    logger.info('[Main] Is packaged:', this.runtimeEnv.isPackaged);
    logger.info('[Main] App path:', this.runtimeEnv.appPath);
    logger.info('[Main] Resources path:', this.runtimeEnv.resourcesPath);

    // 等待应用就绪
    await app.whenReady();
    logger.info('[Main] App is ready');

    // 隐藏 Dock 图标（仅菜单栏应用）
    if (this.runtimeEnv.platform === 'darwin') {
      app.dock.hide();
      logger.info('[Main] Dock icon hidden');
    }

    // 获取正确的模型目录（打包后路径不同）
    const modelsDir = this.getModelsDir();
    logger.info('[Main] Models directory:', modelsDir);

    // 重新初始化 ModelDownloader 使用正确的路径
    this.modelDownloader = new ModelDownloader({ modelsDir });

    // 初始化配置
    await this.configManager.load();
    const config = this.configManager.get();
    const modelKey = this.resolveModelKey(config.whisper?.model);
    const modelName = this.getModelFilename(modelKey);

    // 检查并下载模型
    logger.info('[Main] Checking model:', modelName);
    const modelReady = await this.checkAndDownloadModel(modelName);
    if (!modelReady) {
      logger.error('[Main] Model not ready, exiting...');
      return;
    }
    logger.info('[Main] Model is ready:', modelName);

    // 获取正确的模型路径（打包后路径不同）
    const modelPath = this.runtimePaths.getSharedModelPath(modelName);
    const debugCaptureDir = this.runtimePaths.sharedDebugCapturesDir;
    const debugCaptureStore = new DebugCaptureStore(debugCaptureDir, {
      onError: (message, error) => logger.error('[DebugCaptureStore]', message, error)
    });
    logger.info('[Main] Debug capture directory:', debugCaptureDir);

    // 初始化各模块
    this.audioRecorder = platform.getAudioRecorder({
      sampleRate: 16000,
      channels: 1
    });

    this.whisperEngine = new WhisperEngine({
      modelPath: modelPath,
      vocabPath: config.vocabulary?.path,
      language: config.whisper?.language || 'zh',
      prompt: config.whisper?.prompt || '',
      outputScript: config.whisper?.outputScript || 'simplified',
      enablePunctuation: config.whisper?.enablePunctuation !== false,
      llm: config.whisper?.llm || {},
      whisperBin: this.getWhisperBinPath(),
      debugCaptureStore
    });

    this.inputSimulator = platform.getInputSimulator({
      appendSpace: config.input?.appendSpace !== false
    });

    this.audioCuePlayer = platform.getAudioCuePlayer(config.audioCues || {});

    // 初始化托盘（在快捷键之前，确保有 UI 反馈）
    logger.info('[Main] Initializing tray manager...');
    this.trayManager = new TrayManager();
    this.trayManager.init();
    logger.info('[Main] Tray manager initialized');

    // 设置事件监听
    this.setupEventHandlers();

    // 检查权限
    const permissionState = await this.checkPermissions();

    // 延迟初始化快捷键，避免启动时卡死
    logger.info('[Main] Will initialize shortcut manager in 1s...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.initShortcutManager(config, permissionState);

    logger.info('[Main] Initialization complete');
    logger.info('[Main] ==================== Kory Whisper Ready ====================');
  }

  async initShortcutManager(config, permissionState = {}) {
    logger.info('[Main] Initializing shortcut manager...');
    logger.info('[Main] Shortcut key:', config.shortcut?.key || 'RIGHT COMMAND');
    try {
      if (this.shortcutManager) {
        this.shortcutManager.destroy();
        this.shortcutManager = null;
      }

      this.shortcutManager = new ShortcutManager({
        key: config.shortcut?.key || 'RIGHT COMMAND',
        longPressDuration: config.shortcut?.longPressDuration || 500,
        onInfo: (message) => logger.info('[ShortcutServer]', message),
        onError: (code) => logger.error('[ShortcutServer] exited with code:', code)
      });
      await this.shortcutManager.init();

      // 设置快捷键事件监听
      this.setupShortcutEventHandlers();

      logger.info('[Main] Shortcut manager initialized successfully');
    } catch (error) {
      logger.error('[Main] Failed to initialize shortcut manager:', error);
      const missingAccessibility = permissionState.accessibilityEnabled === false;
      await dialog.showMessageBox({
        type: 'warning',
        title: '快捷键初始化失败',
        message: '无法初始化全局快捷键',
        detail: missingAccessibility
          ? '当前未检测到辅助功能权限。请在系统设置中同时确认“辅助功能”和“输入监控”已授权，并重启应用。\n' + error.message
          : '请检查系统设置中的“辅助功能 / 输入监控”权限，并重启应用。\n' + error.message
      });
    }
  }

  setupShortcutEventHandlers() {
    logger.info('[Main] Setting up shortcut event handlers...');
    // 长按开始 - 开始录音
    this.shortcutManager.on('longPressStart', async () => {
      logger.info('[Main] Long press started - recording...');

      // 每次录音前检查麦克风权限
      const { systemPreferences } = require('electron');
      const micStatus = systemPreferences.getMediaAccessStatus('microphone');
      logger.info('[Main] Microphone status before recording:', micStatus);

      if (micStatus !== 'granted') {
        logger.warn('[Main] Microphone permission not granted, requesting...');
        const granted = await systemPreferences.askForMediaAccess('microphone');
        if (!granted) {
          logger.error('[Main] Microphone permission denied');
          this.trayManager.showErrorState('麦克风权限被拒绝，请在系统设置中允许');
          systemPreferences.openSystemPreferences('security', 'Privacy_Microphone');
          return;
        }
      }

      this.isRecording = true;

      try {
        await startRecordingFeedback({
          audioRecorder: this.audioRecorder,
          trayManager: this.trayManager,
          audioCuePlayer: this.audioCuePlayer,
          onAudioCueError: (error) => logger.error('[Main] Failed to play recording-start cue:', error)
        });
      } catch (error) {
        logger.error('[Main] Failed to start recording:', error);
        this.isRecording = false;
        this.trayManager.setRecordingState(false);

        // 检测权限相关错误
        const errorMsg = error.message || '';
        if (errorMsg.includes('can not open audio device') || errorMsg.includes('audio device')) {
          this.trayManager.showErrorState('麦克风权限被拒绝，请在系统设置中允许');
          const { systemPreferences } = require('electron');
          systemPreferences.openSystemPreferences('security', 'Privacy_Microphone');
        } else {
          this.trayManager.showErrorState('录音启动失败: ' + error.message);
        }
      }
    });

    // 长按结束 - 停止录音并开始识别
    this.shortcutManager.on('longPressEnd', async () => {
      logger.info('[Main] Long press ended - processing...');
      if (!this.isRecording) return;

      this.isRecording = false;
      this.trayManager.setRecordingState(false);
      this.trayManager.showProcessingState();

      try {
        // 停止录音
        const audioPath = await this.audioRecorder.stop();
        logger.info('[Main] Audio saved to:', audioPath);

        // Whisper 识别
        const text = await this.whisperEngine.transcribe(audioPath);
        logger.info('[Main] Transcribed:', text);

        if (text && text.trim()) {
          // 复制到剪贴板，等待用户手动粘贴
          await this.inputSimulator.typeText(text);
          await announceOutputReady({
            trayManager: this.trayManager,
            audioCuePlayer: this.audioCuePlayer,
            onAudioCueError: (error) => logger.error('[Main] Failed to play output-ready cue:', error)
          });
        } else {
          this.trayManager.showErrorState('未识别到语音');
        }
      } catch (error) {
        logger.error('[Main] Processing error:', error);
        this.trayManager.showErrorState(error.message);
      }
    });
  }

  getWhisperBinPath() {
    return this.runtimePaths.whisperBinPath;
  }

  getModelsDir() {
    return this.runtimePaths.sharedModelsDir;
  }

  resolveModelKey(model) {
    const validModels = ['base', 'small', 'medium'];
    return validModels.includes(model) ? model : 'base';
  }

  getModelFilename(modelKey) {
    const mapping = {
      base: 'ggml-base.bin',
      small: 'ggml-small.bin',
      medium: 'ggml-medium.bin'
    };
    return mapping[this.resolveModelKey(modelKey)];
  }

  getModelMinBytes(modelName) {
    const minBytes = {
      'ggml-base.bin': 100 * 1024 * 1024,
      'ggml-small.bin': 300 * 1024 * 1024,
      'ggml-medium.bin': 700 * 1024 * 1024
    };
    return minBytes[modelName] || 50 * 1024 * 1024;
  }

  async checkAndDownloadModel(modelName = 'ggml-base.bin') {
    const modelCheck = await this.modelDownloader.checkModel(modelName);
    const minSize = this.getModelMinBytes(modelName);
    const modelInfo = this.modelDownloader.getModelInfo(modelName);

    if (modelCheck.exists && modelCheck.size > minSize) {
      console.log('[Main] Model already exists:', modelCheck.path);
      return true;
    }

    const bundledModelPath = this.runtimePaths.getBundledModelPath(modelName);
    const seededModel = await this.modelDownloader.seedModelFromPath(bundledModelPath, modelName);
    if (seededModel.copied && seededModel.size > minSize) {
      console.log('[Main] Seeded shared model from bundled resources:', seededModel.path);
      return true;
    }

    // 显示下载对话框
    const result = await dialog.showMessageBox({
      type: 'info',
      buttons: ['下载模型', '退出'],
      defaultId: 0,
      title: '需要下载语音模型',
      message: '首次使用需要下载 Whisper 语音模型',
      detail: `模型: ${modelName}\n模型大小: 约 ${modelInfo.size}\n说明: ${modelInfo.desc}\n下载后下次启动无需再次下载。`
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
      <head><meta charset="UTF-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif; text-align: center; padding: 30px;">
        <h3>正在下载语音模型...</h3>
        <p id="progress">0%</p>
        <p style="font-size: 12px; color: #666;">模型: ${modelName} (${modelInfo.size})</p>
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
      await this.modelDownloader.downloadModel(modelName, (progress) => {
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
    ipcMain.handle('save-config', async (event, config) => {
      await this.applyRuntimeConfig(config);
      await this.configManager.save(config);
    });
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
    const microphoneGranted = await this.ensureMicrophonePermission(systemPreferences);
    const accessibilityEnabled = await this.ensureAccessibilityPermission(systemPreferences);
    return { microphoneGranted, accessibilityEnabled };
  }

  async ensureMicrophonePermission(systemPreferences) {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    logger.info('[Main] Microphone permission status:', micStatus);
    if (micStatus === 'granted') return true;

    logger.info('[Main] Requesting microphone permission...');
    const granted = await systemPreferences.askForMediaAccess('microphone');
    if (granted) return true;

    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['去设置', '稍后'],
      defaultId: 0,
      title: '需要麦克风权限',
      message: 'Kory Whisper 需要麦克风权限来录制语音',
      detail: '请点击"去设置"打开系统偏好设置，在"麦克风"中勾选 Kory Whisper'
    });

    if (result.response === 0) {
      systemPreferences.openSystemPreferences('security', 'Privacy_Microphone');
    }
    return false;
  }

  async ensureAccessibilityPermission(systemPreferences) {
    const accessibilityEnabled = systemPreferences.isTrustedAccessibilityClient(false);
    if (accessibilityEnabled) return true;

    logger.warn('[Main] Accessibility permission not granted');
    systemPreferences.isTrustedAccessibilityClient(true);

    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['辅助功能设置', '输入监控设置', '稍后'],
      defaultId: 0,
      cancelId: 2,
      title: '需要辅助功能权限',
      message: 'Kory Whisper 需要权限来监听按键并输入文本',
      detail: '请在系统设置中确认 Kory Whisper 已在“辅助功能”和“输入监控”中授权，修改后请重启应用。'
    });

    if (result.response === 0) {
      systemPreferences.openSystemPreferences('security', 'Privacy_Accessibility');
    } else if (result.response === 1) {
      systemPreferences.openSystemPreferences('security', 'Privacy_ListenEvent');
    }
    return false;
  }

  async applyRuntimeConfig(config) {
    const modelKey = this.resolveModelKey(config.whisper?.model);
    const modelName = this.getModelFilename(modelKey);
    const modelPath = this.runtimePaths.getSharedModelPath(modelName);

    if (config.whisper) {
      config.whisper.model = modelKey;
    }

    if (this.whisperEngine) {
      let nextModelPath = this.whisperEngine.modelPath;
      if (this.whisperEngine.modelPath !== modelPath) {
        logger.info('[Main] Switching model to:', modelName);
        const modelReady = await this.checkAndDownloadModel(modelName);
        if (!modelReady) {
          throw new Error('模型下载被取消，未切换模型');
        }
        nextModelPath = modelPath;
      }

      this.whisperEngine.updateRuntimeOptions({
        modelPath: nextModelPath,
        vocabPath: config.vocabulary?.path || this.whisperEngine.vocabPath,
        language: config.whisper?.language || this.whisperEngine.language,
        prompt: config.whisper?.prompt || '',
        outputScript: config.whisper?.outputScript || 'simplified',
        enablePunctuation: config.whisper?.enablePunctuation !== false,
        llm: config.whisper?.llm || {}
      });
    }

    if (this.inputSimulator) {
      this.inputSimulator.appendSpace = config.input?.appendSpace !== false;
    }

    if (this.audioCuePlayer && typeof this.audioCuePlayer.updateOptions === 'function') {
      this.audioCuePlayer.updateOptions(config.audioCues || {});
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
  // 停止本地 LLM 服务器
  if (koryApp.whisperEngine && koryApp.whisperEngine.localLLM) {
    koryApp.whisperEngine.localLLM.stopServer();
  }
});

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
