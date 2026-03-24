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
    whisperBinPath: resolveBundledBinaryPath('whisper-cli', runtimeEnv),
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
  createRuntimePaths
};
