function registerAppLifecycle(options = {}) {
  const app = options.app;
  const logger = options.logger || console;

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return null;
  }

  const bootstrap = options.createBootstrap();

  app.on('ready', async () => {
    try {
      await bootstrap.start();
    } catch (error) {
      logger.error('[Main] Failed during startup:', error);
    }
  });

  app.on('window-all-closed', (event) => {
    event.preventDefault();
  });

  app.on('activate', () => {});

  app.on('will-quit', async () => {
    try {
      await bootstrap.dispose();
    } catch (error) {
      logger.error('[Main] Failed during shutdown cleanup:', error);
    }
  });

  return bootstrap;
}

module.exports = {
  registerAppLifecycle
};
