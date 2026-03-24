const RecordingService = require('../services/recording-service');
const {
  prepareTranscriptionService,
  resolveModelKey
} = require('../services/transcription-service');
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

function requireRuntimeEnv(runtimeEnv) {
  if (!runtimeEnv || !runtimeEnv.platform) {
    throw new Error('Missing required runtimeEnv.platform');
  }

  return runtimeEnv;
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
    this.runtimeEnv = requireRuntimeEnv(options.runtimeEnv);
    this.runtimePaths = options.runtimePaths || null;
    this.platformApi = getPlatformApi(this.runtimeEnv, options);
    this.shortcutStartDelayMs = options.shortcutStartDelayMs || 0;
    this.wait = options.wait || ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    this.collaborators = options.collaborators || {};
    this.prepareTranscriptionService = options.prepareTranscriptionService || prepareTranscriptionService;
    this.configManager = options.configManager || this.createConfigManager(options);
    this.modelDownloader = options.modelDownloader || null;
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

  async initialize() {
    if (typeof this.configManager.load === 'function') {
      await this.configManager.load();
    }

    const config = this.configManager.get();
    await this.buildServices(config);
    if (!this.services.transcription) {
      return false;
    }

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

  async buildServices(config) {
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
    const transcriptionService = this.collaborators.transcriptionService || await this.prepareTranscriptionService({
      config,
      dialog: this.dialog,
      BrowserWindow: this.BrowserWindow,
      logger: this.logger,
      modelDownloader: this.modelDownloader,
      runtimeEnv: this.runtimeEnv,
      runtimePaths: this.runtimePaths,
      whisperEngine: this.collaborators.whisperEngine
    });

    this.services = {
      recording: new RecordingService({ audioRecorder }),
      transcription: transcriptionService,
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
    if (config.whisper) {
      config.whisper.model = resolveModelKey(config.whisper.model);
    }

    if (this.services.transcription && typeof this.services.transcription.applyConfig === 'function') {
      await this.services.transcription.applyConfig({
        ...config,
        vocabulary: {
          ...config.vocabulary,
          path: config.vocabulary?.path || this.configManager.getVocabPath()
        }
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
