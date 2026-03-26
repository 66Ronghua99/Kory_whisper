const { resolveBundledBinaryPath, resolvePackagedAssetPath } = require('../distribution/bundled-assets');
const {
  getBundledModelPath,
  getSharedAppDir,
  getSharedModelPath,
  getSharedModelsDir,
  joinPathSegments
} = require('../shared/model-paths');
const { getRuntimeFacts } = require('./runtime-capabilities');
const { createRuntimeEnv } = require('./runtime-env');

function resolveWhisperBinaryPath(runtimeEnv) {
  return resolveBundledBinaryPath('whisper-cli', runtimeEnv);
}

function resolveFfmpegBinaryPath(runtimeEnv) {
  if (runtimeEnv.platform !== 'win32') {
    return null;
  }

  return resolveBundledBinaryPath('ffmpeg', runtimeEnv);
}

function createRuntimePaths(options = {}) {
  const runtimeEnv = options.runtimeEnv || createRuntimeEnv(options);
  const runtimeFacts = options.runtimeFacts || getRuntimeFacts(runtimeEnv);

  const sharedAppDir = getSharedAppDir({ homeDir: runtimeEnv.homeDir });
  const sharedModelsDir = getSharedModelsDir({ homeDir: runtimeEnv.homeDir });

  return {
    runtimeEnv,
    runtimeFacts,
    sharedAppDir,
    sharedModelsDir,
    sharedDebugCapturesDir: joinPathSegments([sharedAppDir, 'debug-captures'], [sharedAppDir]),
    bundledModelsDir: resolvePackagedAssetPath('models', runtimeEnv),
    ffmpegBinPath: resolveFfmpegBinaryPath(runtimeEnv),
    whisperBinPath: resolveWhisperBinaryPath(runtimeEnv),
    getSharedModelPath(modelName) {
      return getSharedModelPath(modelName, { homeDir: runtimeEnv.homeDir });
    },
    getBundledModelPath(modelName) {
      return getBundledModelPath(modelName, {
        isPackaged: runtimeEnv.isPackaged,
        resourcesPath: runtimeEnv.resourcesPath
      });
    }
  };
}

module.exports = {
  createRuntimePaths,
  resolveFfmpegBinaryPath,
  resolveWhisperBinaryPath
};
