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

function mergeConfigPatch(currentConfig = {}, patch = {}) {
  if (patch === undefined || patch === null) {
    return currentConfig;
  }

  if (Array.isArray(patch) || typeof patch !== 'object') {
    return patch;
  }

  if (!currentConfig || typeof currentConfig !== 'object' || Array.isArray(currentConfig)) {
    return { ...patch };
  }

  const merged = { ...currentConfig };

  for (const key of Object.keys(patch)) {
    merged[key] = mergeConfigPatch(currentConfig[key], patch[key]);
  }

  return merged;
}

function sanitizeConfigForRenderer(config = {}) {
  const sanitized = mergeConfigPatch({}, config);

  if (sanitized.whisper && Object.prototype.hasOwnProperty.call(sanitized.whisper, 'llm')) {
    delete sanitized.whisper.llm;
  }

  return sanitized;
}

function normalizePermissionContractFromProfile(profile = {}) {
  return profile && profile.uiContract ? profile.uiContract : {};
}

function getPlatformShortcutDefaultKey(profile = {}) {
  const uiContract = normalizePermissionContractFromProfile(profile);
  return uiContract.shortcut?.defaultKey || 'RIGHT COMMAND';
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
    const ConfigManager = require('../config/config-manager');
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
    const permissionState = await this.loadStartupReadiness();
    this.syncTrayPermissionReadiness(permissionState);
    if (!permissionState.isReady) {
      if (this.services.tray && typeof this.services.tray.showPermissionBlocked === 'function') {
        this.services.tray.showPermissionBlocked(permissionState);
      }

      if (permissionState.firstRunNeedsOnboarding) {
        this.openPermissionOnboarding();
      }
    }

    if (this.shortcutStartDelayMs > 0) {
      await this.wait(this.shortcutStartDelayMs);
    }

    try {
      await this.services.shortcut.start();
    } catch (error) {
      if (permissionState.isReady) {
        await this.services.permission.showShortcutInitializationFailure(error, permissionState);
      }
      this.logger.error('[Main] Failed to initialize shortcut manager:', error);
    }

    return true;
  }

  async buildServices(config) {
    const shortcutManager = this.collaborators.shortcutManager || this.createShortcutManager(config);
    const trayManager = this.collaborators.trayManager || this.createTrayManager();
    const audioRecorder = this.collaborators.audioRecorder || this.platformApi.getAudioRecorder({
      ffmpegBinary: this.runtimePaths && this.runtimePaths.ffmpegBinPath,
      sampleRate: 16000,
      channels: 1
    });
    const permissionGateway = this.collaborators.permissionGateway || this.platformApi.getPermissionGateway({
      systemPreferences: this.systemPreferences,
      shell: this.shell
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
      loadVocabularyData: this.collaborators.loadVocabularyData,
      modelDownloader: this.modelDownloader,
      postProcessingPipeline: this.collaborators.postProcessingPipeline,
      createPostProcessingContext: this.collaborators.createPostProcessingContext,
      applyPostProcessing: this.collaborators.applyPostProcessing,
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
        dialog: this.dialog,
        permissionContract: this.getPlatformPermissionContract()
      })
    };

    this.services.dictation = new DictationService({
      permissionService: this.services.permission,
      recordingService: this.services.recording,
      transcriptionService: this.services.transcription,
      injectionService: this.services.injection,
      cueService: this.services.cue,
      trayService: this.services.tray,
      permissionContract: this.getPlatformPermissionContract(),
      logger: this.logger
    });
  }

  createShortcutManager(config) {
    const ShortcutManager = require('../shortcut-manager');
    return new ShortcutManager({
      key: config.shortcut?.key || getPlatformShortcutDefaultKey(this.platformApi.profile),
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
      .on('open-permission-onboarding', () => this.openPermissionOnboarding())
      .on('recheck-permission-readiness', async () => {
        const readiness = await this.safePermissionReadiness('recheck');
        this.syncTrayPermissionReadiness(readiness);
        return readiness;
      })
      .on('open-permission-settings', (surface) => this.services.permission.openSettings(surface))
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

    this.ipcMain.handle('get-config', () => {
      if (typeof this.configManager.sanitizeForRenderer === 'function') {
        return {
          ...this.configManager.sanitizeForRenderer(this.configManager.get()),
          platformContract: this.getPlatformPermissionContract(),
          platformUiContract: this.getPlatformUiContract()
        };
      }

      return {
        ...sanitizeConfigForRenderer(this.configManager.get()),
        platformContract: this.getPlatformPermissionContract(),
        platformUiContract: this.getPlatformUiContract()
      };
    });
    this.ipcMain.handle('save-config', async (event, configPatch) => {
      const nextConfig = typeof this.configManager.mergeRendererPatch === 'function'
        ? this.configManager.mergeRendererPatch(this.configManager.get(), configPatch)
        : mergeConfigPatch(this.configManager.get(), configPatch);

      await this.applyRuntimeConfig(nextConfig);
      await this.configManager.save(nextConfig);
    });
    this.ipcMain.handle('open-vocab-editor', () => this.openVocabEditor());
    this.ipcMain.handle('get-permission-readiness', async () => this.safePermissionReadiness('check'));
    this.ipcMain.handle('recheck-permission-readiness', async () => {
      const readiness = await this.safePermissionReadiness('recheck');
      this.syncTrayPermissionReadiness(readiness);
      return readiness;
    });
    this.ipcMain.handle('open-permission-settings', (event, surface) => this.services.permission.openSettings(surface));
    this.ipcMain.handle('open-permission-onboarding', () => this.openPermissionOnboarding());
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

  async loadStartupReadiness() {
    return this.safePermissionReadiness('check');
  }

  async safePermissionReadiness(mode = 'check') {
    try {
      if (mode === 'recheck' && this.services.permission && typeof this.services.permission.recheckReadiness === 'function') {
        return await this.services.permission.recheckReadiness();
      }

      return await this.services.permission.getReadiness();
    } catch (error) {
      this.logger.error('[Main] Failed to load permission readiness:', error);
      return {
        isReady: false,
        firstRunNeedsOnboarding: false,
        refreshedAt: new Date().toISOString(),
        surfaces: {
          microphone: {
            status: 'unknown',
            reason: 'readiness-check-failed',
            cta: 'open-settings-and-recheck',
            settingsTarget: 'microphone'
          },
          accessibility: {
            status: 'unknown',
            reason: 'readiness-check-failed',
            cta: 'open-settings-and-recheck',
            settingsTarget: 'accessibility'
          },
          inputMonitoring: {
            status: 'unknown',
            reason: 'readiness-check-failed',
            cta: 'open-settings-and-recheck',
            settingsTarget: 'input-monitoring'
          }
        }
      };
    }
  }

  openPermissionOnboarding() {
    const trayManager = this.getRuntimeTrayManager();
    if (trayManager && typeof trayManager.showPermissionOnboarding === 'function') {
      trayManager.showPermissionOnboarding();
    }
  }

  syncTrayPermissionReadiness(readiness) {
    if (this.services.tray && typeof this.services.tray.setPermissionReadiness === 'function') {
      this.services.tray.setPermissionReadiness(readiness, this.getPlatformUiContract());
    }
  }

  getPlatformPermissionContract() {
    return normalizePermissionContractFromProfile(this.platformApi.profile || {});
  }

  getPlatformUiContract() {
    return normalizePermissionContractFromProfile(this.platformApi.profile || {});
  }

  getRuntimeTrayManager() {
    if (this.services.tray && this.services.tray.trayManager) {
      return this.services.tray.trayManager;
    }

    return this.collaborators.trayManager || null;
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
  createCompositionRoot,
  mergeConfigPatch,
  sanitizeConfigForRenderer
};
