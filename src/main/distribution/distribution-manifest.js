const DISTRIBUTION_MANIFEST = Object.freeze({
  bundledBinaries: Object.freeze({
    'whisper-cli': Object.freeze({
      id: 'whisper-cli',
      packaged: true,
      packagedPlatforms: Object.freeze(['darwin']),
      relativePaths: Object.freeze({
        default: 'bin/whisper-cli',
        win32: 'bin/whisper-cli.exe'
      })
    })
  }),
  packagedAssets: Object.freeze([
    Object.freeze({ id: 'bin', relativePath: 'bin' }),
    Object.freeze({ id: 'models', relativePath: 'models' })
  ])
});

function isPackagedPlatformSupported(binary, platform) {
  if (!platform) {
    return true;
  }

  return Array.isArray(binary.packagedPlatforms)
    ? binary.packagedPlatforms.includes(platform)
    : true;
}

function getBundledBinary(binaryId, runtimeEnv = {}) {
  const binary = DISTRIBUTION_MANIFEST.bundledBinaries[binaryId];
  if (!binary) {
    throw new Error(`Unknown bundled binary: ${binaryId}`);
  }

  if (runtimeEnv.isPackaged && !isPackagedPlatformSupported(binary, runtimeEnv.platform)) {
    throw new Error(`Packaged binary ${binaryId} is not declared for platform ${runtimeEnv.platform}`);
  }

  return {
    id: binary.id,
    relativePath: binary.relativePaths[runtimeEnv.platform] || binary.relativePaths.default,
    packaged: binary.packaged
  };
}

function getPackagedAsset(assetId) {
  const asset = DISTRIBUTION_MANIFEST.packagedAssets.find((entry) => entry.id === assetId);
  if (!asset) {
    throw new Error(`Unknown packaged asset: ${assetId}`);
  }

  return { ...asset };
}

function listPackagedAssets() {
  return DISTRIBUTION_MANIFEST.packagedAssets.map((asset) => ({ ...asset }));
}

module.exports = {
  DISTRIBUTION_MANIFEST,
  getBundledBinary,
  getPackagedAsset,
  listPackagedAssets
};
