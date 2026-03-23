const { createRuntimeEnv } = require('../runtime/runtime-env');
const { createRuntimePaths } = require('../runtime/runtime-paths');
const { createCompositionRoot } = require('./composition-root');

function getLogger(options = {}) {
  if (options.logger) {
    return options.logger;
  }

  return require('../logger');
}

class AppBootstrap {
  constructor(options = {}) {
    this.app = options.app;
    this.logger = getLogger(options);
    this.createRuntimeEnv = options.createRuntimeEnv || createRuntimeEnv;
    this.createRuntimePaths = options.createRuntimePaths || createRuntimePaths;
    this.createCompositionRoot = options.createCompositionRoot || createCompositionRoot;
    this.root = null;
    this.runtimeEnv = null;
    this.runtimePaths = null;
  }

  async start() {
    this.runtimeEnv = this.createRuntimeEnv({
      app: this.app
    });
    this.runtimePaths = this.createRuntimePaths({
      runtimeEnv: this.runtimeEnv
    });

    await this.logger.init();
    this.logger.info('[Main] ==================== Kory Whisper Starting ====================');
    this.logger.info('[Main] App version:', this.app.getVersion());
    this.logger.info('[Main] Electron version:', process.versions.electron);
    this.logger.info('[Main] Node version:', process.versions.node);
    this.logger.info('[Main] Platform:', this.runtimeEnv.platform, this.runtimeEnv.arch);
    this.logger.info('[Main] Is packaged:', this.runtimeEnv.isPackaged);
    this.logger.info('[Main] App path:', this.runtimeEnv.appPath);
    this.logger.info('[Main] Resources path:', this.runtimeEnv.resourcesPath);

    await this.app.whenReady();
    this.logger.info('[Main] App is ready');

    if (this.runtimeEnv.platform === 'darwin' && this.app.dock && typeof this.app.dock.hide === 'function') {
      this.app.dock.hide();
      this.logger.info('[Main] Dock icon hidden');
    }

    this.root = this.createCompositionRoot({
      app: this.app,
      logger: this.logger,
      runtimeEnv: this.runtimeEnv,
      runtimePaths: this.runtimePaths,
      shortcutStartDelayMs: 1000
    });

    await this.root.initialize();
    this.logger.info('[Main] Initialization complete');
    this.logger.info('[Main] ==================== Kory Whisper Ready ====================');
    return this.root;
  }

  async dispose() {
    if (this.root && typeof this.root.dispose === 'function') {
      await this.root.dispose();
    }
  }
}

function bootstrapApp(options = {}) {
  return new AppBootstrap(options);
}

module.exports = {
  AppBootstrap,
  bootstrapApp
};
