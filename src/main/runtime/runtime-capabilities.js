function getRuntimeFacts(runtimeEnv = {}) {
  const platform = runtimeEnv.platform;

  return {
    platform: {
      isMac: platform === 'darwin',
      isWindows: platform === 'win32',
      isLinux: platform === 'linux'
    },
    packaging: {
      isPackaged: runtimeEnv.isPackaged === true,
      hasResourcesPath: Boolean(runtimeEnv.resourcesPath),
      hasBundledAssets: runtimeEnv.isPackaged === true && Boolean(runtimeEnv.resourcesPath)
    },
    directories: {
      hasHomeDir: Boolean(runtimeEnv.homeDir)
    }
  };
}

module.exports = {
  getRuntimeFacts,
  getRuntimeCapabilities: getRuntimeFacts
};
