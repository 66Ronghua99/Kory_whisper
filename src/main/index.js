const { app, dialog, BrowserWindow } = require('electron');
const logger = require('./logger');
const { bootstrapApp } = require('./app/bootstrap');
const { registerAppLifecycle } = require('./app/lifecycle');
const { runWindowsSmokeCli } = require('./cli/windows-smoke.js');

function getWindowsSmokeArgv(argv = process.argv.slice(1)) {
  return argv.filter((arg) => arg !== '--smoke-windows');
}

function isWindowsSmokeMode(argv = process.argv.slice(1)) {
  return argv.includes('--smoke-windows');
}

async function runWindowsSmokeMode() {
  const argv = getWindowsSmokeArgv(process.argv.slice(1));
  const isHelpRequest = argv.includes('--help') || argv.includes('-h');

  if (!isHelpRequest) {
    await app.whenReady();
  }

  const result = await runWindowsSmokeCli(argv, {
    app,
    dialog,
    BrowserWindow,
    logger
  });

  if (result && !result.runner && typeof result.exitCode === 'number') {
    app.exit(result.exitCode);
  }
}

if (isWindowsSmokeMode()) {
  void runWindowsSmokeMode();
} else {
  registerAppLifecycle({
    app,
    logger,
    createBootstrap() {
      return bootstrapApp({
        app,
        logger
      });
    }
  });
}
