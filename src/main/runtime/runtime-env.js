const os = require('os');

function resolveAppPath(app, fallback) {
  if (fallback) {
    return fallback;
  }

  if (app && typeof app.getAppPath === 'function') {
    try {
      return app.getAppPath();
    } catch {
      return process.cwd();
    }
  }

  return process.cwd();
}

function createRuntimeEnv(options = {}) {
  const runtimeProcess = options.process || process;
  const runtimeOs = options.os || os;
  const app = options.app || null;

  return {
    platform: options.platform || runtimeProcess.platform,
    arch: options.arch || runtimeProcess.arch,
    isPackaged: options.isPackaged !== undefined ? options.isPackaged : Boolean(app && app.isPackaged),
    appPath: resolveAppPath(app, options.appPath),
    resourcesPath: options.resourcesPath || runtimeProcess.resourcesPath || null,
    homeDir: options.homeDir || runtimeOs.homedir()
  };
}

module.exports = {
  createRuntimeEnv
};
