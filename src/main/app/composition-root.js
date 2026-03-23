const RecordingService = require('../services/recording-service');
const TranscriptionService = require('../services/transcription-service');
const InjectionService = require('../services/injection-service');
const CueService = require('../services/cue-service');
const TrayService = require('../services/tray-service');
const ShortcutService = require('../services/shortcut-service');
const PermissionService = require('../services/permission-service');
const DictationService = require('../services/dictation-service');

function getElectronSurface(overrides = {}) {
  if (overrides.electron) {
    return overrides.electron;
  }

  try {
    return require('electron');
  } catch {
    return {};
  }
}

function getPlatformApi(runtimeEnv, overrides = {}) {
  if (overrides.platformApi) {
    return overrides.platformApi;
  }

  return require('../platform').createPlatformApi({
    platform: runtimeEnv.platform
  });
}

function getLoggerModule(overrides = {}) {
  if (overrides.loggerModule) {
    return overrides.loggerModule;
  }

  return require('../logger');
}

function resolveModelKey(model) {
  const validModels = ['base', 'small', 'medium'];
  return validModels.includes(model) ? model : 'base';
}

function getModelFilename(modelKey) {
  const mapping = {
    base: 'ggml-base.bin',
    small: 'ggml-small.bin',
    medium: 'ggml-medium.bin'
  };
  return mapping[resolveModelKey(modelKey)];
}

function getModelMinBytes(modelName) {
  const minBytes = {
    'ggml-base.bin': 100 * 1024 * 1024,
    'ggml-small.bin': 300 * 1024 * 1024,
    'ggml-medium.bin': 700 * 1024 * 1024
  };
  return minBytes[modelName] || 50 * 1024 * 1024;
}

class CompositionRoot {
  constructor(options = {}) {
    const electron = getElectronSurface(options);
    this.app = options.app || electron.app || null;
    this.ipcMain = options.ipcMain || electron.ipcMain || null;
    this.dialog = options.dialog || electron.dialog || null;
    this.shell = options.shell || electron.shell || null;
    this.BrowserWindow = options.BrowserWindow || electron.BrowserWindow || null;
    this.systemPreferences = options.systemPreferences || electron.systemPreferences || null;
    this.logger = options.logger || getLoggerModule(options);
    this.loggerModule = getLoggerModule(options);
    this.runtimeEnv = options.runtimeEnv || { platform: process.platform };
    this.runtimePaths = options.runtimePaths || null;
    this.platformApi = getPlatformApi(this.runtimeEnv, options);
    this.shortcutStartDelayMs = options.shortcutStartDelayMs || 0;
    this.wait = options.wait || ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    this.collaborators = options.collaborators || {};
    this.configManager = options.configManager || this.createConfigManager(options);
    this.modelDownloader = options.modelDownloader || this.createModelDownloader();
    this.services = {};
  }

  createConfigManager(options = {}) {
    const ConfigManager = require('../config-manager');
    return new ConfigManager({
      runtimeEnv: this.runtimeEnv,
      profile: this.platformApi.profile,
      app: this.app,
      ...options.configOptions
    });
  }

  createModelDownloader() {
    const ModelDownloader = require('../model-downloader');
    return new ModelDownloader({
      modelsDir: this.runtimePaths ? this.runtimePaths.sharedModelsDir : undefined
    });
  }

  async initialize() {
    if (typeof this.configManager.load === 'function') {
      await this.configManager.load();
    }

    const config = this.configManager.get();
    const modelName = getModelFilename(config.whisper?.model);

    if (!this.collaborators.whisperEngine) {
      const modelReady = await this.checkAndDownloadModel(modelName);
      if (!modelReady) {
        return false;
      }
    }

    this.buildServices(config, modelName);
    this.registerAppEvents();

    this.services.tray.init();
    const permissionState = await this.services.permission.ensureStartupPermissions();

    if (this.shortcutStartDelayMs > 0) {
      await this.wait(this.shortcutStartDelayMs);
    }

    try {
      await this.services.shortcut.start();
    } catch (error) {
      await this.services.permission.showShortcutInitializationFailure(error, permissionState);
      this.logger.error('[Main] Failed to initialize shortcut manager:', error);
    }

    return true;
  }

  buildServices(config, modelName) {
    const shortcutManager = this.collaborators.shortcutManager || this.createShortcutManager(config);
    const trayManager = this.collaborators.trayManager || this.createTrayManager();
    const audioRecorder = this.collaborators.audioRecorder || this.platformApi.getAudioRecorder({
      sampleRate: 16000,
      channels: 1
    });
    const permissionGateway = this.collaborators.permissionGateway || this.platformApi.getPermissionGateway({
      systemPreferences: this.systemPreferences
    });
    const audioCuePlayer = this.collaborators.audioCuePlayer || this.platformApi.getAudioCuePlayer(config.audioCues || {});
    const inputSimulator = this.collaborators.inputSimulator || this.platformApi.getInputSimulator({
      appendSpace: config.input?.appendSpace !== false
    });
    const whisperEngine = this.collaborators.whisperEngine || this.createWhisperEngine(config, modelName);

    this.services = {
      recording: new RecordingService({ audioRecorder }),
      transcription: new TranscriptionService({ whisperEngine }),
      injection: new InjectionService({ inputSimulator }),
      cue: new CueService({ audioCuePlayer }),
      tray: new TrayService({ trayManager }),
      shortcut: new ShortcutService({ shortcutManager }),
      permission: new PermissionService({
        permissionGateway,
        dialog: this.dialog
      })
    };

    this.services.dictation = new DictationService({
      permissionService: this.services.permission,
      recordingService: this.services.recording,
      transcriptionService: this.services.transcription,
      injectionService: this.services.injection,
      cueService: this.services.cue,
      trayService: this.services.tray,
      logger: this.logger
    });
  }

  createShortcutManager(config) {
    const ShortcutManager = require('../shortcut-manager');
    return new ShortcutManager({
      key: config.shortcut?.key || 'RIGHT COMMAND',
      longPressDuration: config.shortcut?.longPressDuration || 500,
      onInfo: (message) => this.logger.info('[ShortcutServer]', message),
      onError: (code) => this.logger.error('[ShortcutServer] exited with code:', code)
    });
  }

  createTrayManager() {
    const TrayManager = require('../tray-manager');
    return new TrayManager();
  }

  createWhisperEngine(config, modelName) {
    const WhisperEngine = require('../whisper-engine');
    const DebugCaptureStore = require('../debug-capture-store');
    const debugCaptureStore = new DebugCaptureStore(this.runtimePaths.sharedDebugCapturesDir, {
      onError: (message, error) => this.logger.error('[DebugCaptureStore]', message, error)
    });

    return new WhisperEngine({
      modelPath: this.runtimePaths.getSharedModelPath(modelName),
      vocabPath: config.vocabulary?.path,
      language: config.whisper?.language || 'zh',
      prompt: config.whisper?.prompt || '',
      outputScript: config.whisper?.outputScript || 'simplified',
      enablePunctuation: config.whisper?.enablePunctuation !== false,
      llm: config.whisper?.llm || {},
      whisperBin: this.runtimePaths.whisperBinPath,
      debugCaptureStore
    });
  }

  registerAppEvents() {
    this.registerShortcutHandlers();
    this.registerTrayHandlers();
    this.registerIpcHandlers();
  }

  registerShortcutHandlers() {
    this.services.shortcut
      .onLongPressStart(() => this.services.dictation.handleShortcutStart())
      .onLongPressEnd(() => this.services.dictation.handleShortcutEnd());
  }

  registerTrayHandlers() {
    this.services.tray
      .on('show-settings', () => this.services.tray.openSettings())
      .on('open-vocab', () => this.openVocabEditor())
      .on('quit', () => {
        if (this.app && typeof this.app.quit === 'function') {
          this.app.quit();
        }
      });
  }

  registerIpcHandlers() {
    if (!this.ipcMain || typeof this.ipcMain.handle !== 'function') {
      return;
    }

    this.ipcMain.handle('get-config', () => this.configManager.get());
    this.ipcMain.handle('save-config', async (event, config) => {
      await this.applyRuntimeConfig(config);
      await this.configManager.save(config);
    });
    this.ipcMain.handle('open-vocab-editor', () => this.openVocabEditor());
    this.ipcMain.handle('get-logs', async () => {
      if (typeof this.loggerModule.getRecentLogs === 'function') {
        return this.loggerModule.getRecentLogs(200);
      }
      return [];
    });
    this.ipcMain.handle('open-logs', () => {
      if (this.shell && typeof this.loggerModule.getLogPath === 'function') {
        this.shell.openPath(this.loggerModule.getLogPath());
      }
    });
  }

  async applyRuntimeConfig(config) {
    const modelName = getModelFilename(config.whisper?.model);
    const modelPath = this.runtimePaths.getSharedModelPath(modelName);

    if (config.whisper) {
      config.whisper.model = resolveModelKey(config.whisper.model);
    }

    if (this.services.transcription) {
      let nextModelPath = this.services.transcription.whisperEngine?.modelPath || modelPath;
      if (nextModelPath !== modelPath && !this.collaborators.whisperEngine) {
        const modelReady = await this.checkAndDownloadModel(modelName);
        if (!modelReady) {
          throw new Error('模型下载被取消，未切换模型');
        }
        nextModelPath = modelPath;
      } else {
        nextModelPath = modelPath;
      }

      this.services.transcription.updateRuntimeOptions({
        modelPath: nextModelPath,
        vocabPath: config.vocabulary?.path || this.configManager.getVocabPath(),
        language: config.whisper?.language || 'zh',
        prompt: config.whisper?.prompt || '',
        outputScript: config.whisper?.outputScript || 'simplified',
        enablePunctuation: config.whisper?.enablePunctuation !== false,
        llm: config.whisper?.llm || {}
      });
    }

    if (this.services.injection) {
      this.services.injection.updateOptions({
        appendSpace: config.input?.appendSpace !== false
      });
    }

    if (this.services.cue) {
      this.services.cue.updateOptions(config.audioCues || {});
    }
  }

  openVocabEditor() {
    if (!this.shell || typeof this.shell.openPath !== 'function') {
      return;
    }

    this.shell.openPath(this.configManager.getVocabPath());
  }

  async checkAndDownloadModel(modelName = 'ggml-base.bin') {
    const modelCheck = await this.modelDownloader.checkModel(modelName);
    const minSize = getModelMinBytes(modelName);
    const modelInfo = this.modelDownloader.getModelInfo(modelName);

    if (modelCheck.exists && modelCheck.size > minSize) {
      return true;
    }

    const bundledModelPath = this.runtimePaths.getBundledModelPath(modelName);
    const seededModel = await this.modelDownloader.seedModelFromPath(bundledModelPath, modelName);
    if (seededModel.copied && seededModel.size > minSize) {
      return true;
    }

    if (!this.dialog || typeof this.dialog.showMessageBox !== 'function') {
      throw new Error(`Model missing and no dialog available for download prompt: ${modelName}`);
    }

    const result = await this.dialog.showMessageBox({
      type: 'info',
      buttons: ['下载模型', '退出'],
      defaultId: 0,
      title: '需要下载语音模型',
      message: '首次使用需要下载 Whisper 语音模型。',
      detail: `模型: ${modelName}\n模型大小: 约 ${modelInfo.size}\n说明: ${modelInfo.desc}`
    });

    if (result.response !== 0) {
      return false;
    }

    const progressWindow = this.createDownloadProgressWindow(modelName, modelInfo.size);

    try {
      await this.modelDownloader.downloadModel(modelName, (progress) => {
        if (progressWindow && progressWindow.webContents) {
          progressWindow.webContents.send('progress', progress);
        }
      });

      if (progressWindow) {
        progressWindow.close();
      }
      return true;
    } catch (error) {
      if (progressWindow) {
        progressWindow.close();
      }
      if (typeof this.dialog.showErrorBox === 'function') {
        this.dialog.showErrorBox('下载失败', `模型下载失败，请检查网络连接。\n${error.message}`);
      }
      return false;
    }
  }

  createDownloadProgressWindow(modelName, modelSize) {
    if (!this.BrowserWindow) {
      return null;
    }

    const progressWindow = new this.BrowserWindow({
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

    progressWindow.loadURL(`data:text/html,
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: sans-serif; text-align: center; padding: 30px;">
        <h3>正在下载语音模型...</h3>
        <p id="progress">0%</p>
        <p style="font-size: 12px; color: #666;">模型: ${modelName} (${modelSize})</p>
      </body>
      <script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('progress', (event, progress) => {
          document.getElementById('progress').textContent = progress + '%';
        });
      </script>
      </html>
    `);

    return progressWindow;
  }

  async dispose() {
    if (this.services.shortcut) {
      this.services.shortcut.stop();
    }

    if (this.services.transcription) {
      await this.services.transcription.dispose();
    }

    if (this.services.tray) {
      this.services.tray.dispose();
    }
  }
}

function createCompositionRoot(options = {}) {
  return new CompositionRoot(options);
}

module.exports = {
  CompositionRoot,
  createCompositionRoot
};
