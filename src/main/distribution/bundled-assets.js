const {
  getBundledBinary,
  getPackagedAsset
} = require('./distribution-manifest');
const {
  joinPathSegments,
  splitRelativePath
} = require('../shared/model-paths');

function getDistributionRoot(runtimeEnv = {}) {
  if (runtimeEnv.isPackaged) {
    if (!runtimeEnv.resourcesPath) {
      throw new Error('Packaged runtime requires resourcesPath');
    }
    return runtimeEnv.resourcesPath;
  }

  if (!runtimeEnv.appPath) {
    throw new Error('Development runtime requires appPath');
  }

  return runtimeEnv.appPath;
}

function resolveRelativeManifestPath(relativePath, rootPath) {
  return joinPathSegments([rootPath, ...splitRelativePath(relativePath)], [rootPath, relativePath]);
}

function resolveBundledBinaryPath(binaryId, runtimeEnv = {}) {
  const binary = getBundledBinary(binaryId, runtimeEnv);
  return resolveRelativeManifestPath(binary.relativePath, getDistributionRoot(runtimeEnv));
}

function resolvePackagedAssetPath(assetId, runtimeEnv = {}) {
  if (!runtimeEnv.isPackaged) {
    return null;
  }

  const asset = getPackagedAsset(assetId, runtimeEnv);
  return resolveRelativeManifestPath(asset.relativePath, getDistributionRoot(runtimeEnv));
}

module.exports = {
  resolveBundledBinaryPath,
  resolvePackagedAssetPath
};
