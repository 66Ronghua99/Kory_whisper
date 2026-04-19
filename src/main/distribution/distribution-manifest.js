function freezeClone(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeClone(entry)));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const clone = {};
  for (const [key, entry] of Object.entries(value)) {
    clone[key] = freezeClone(entry);
  }
  return Object.freeze(clone);
}

const DISTRIBUTION_MANIFEST = freezeClone({
  bundledBinaries: {
    ffmpeg: {
      id: 'ffmpeg',
      packaged: true,
      packagedPlatforms: ['win32'],
      relativePaths: {
        default: 'bin/ffmpeg',
        win32: 'bin/ffmpeg.exe'
      }
    },
    'whisper-cli': {
      id: 'whisper-cli',
      packaged: true,
      packagedPlatforms: ['darwin', 'win32'],
      relativePaths: {
        default: 'bin/whisper-cli',
        win32: 'bin/whisper-cli.exe'
      }
    }
  },
  packagedAssets: [
    {
      id: 'bin',
      relativePath: 'bin',
      packagedPlatforms: ['darwin', 'win32'],
      builder: {
        from: 'bin',
        to: 'bin',
        filters: {
          default: ['**/*'],
          darwin: ['whisper-cli'],
          win32: ['ffmpeg.exe', 'whisper-cli.exe', 'whisper.dll', 'ggml.dll', 'ggml-base.dll', 'ggml-cpu.dll']
        }
      }
    },
    {
      id: 'models',
      relativePath: 'models',
      packagedByDefault: false,
      packagedPlatforms: ['darwin', 'win32'],
      builder: {
        from: 'models',
        to: 'models',
        filters: {
          default: ['*.bin']
        }
      }
    }
  ],
  installerPrerequisites: {
    darwin: [
      {
        id: 'bundled-whisper-cli',
        status: 'ready',
        detail: 'Packaged macOS builds bundle bin/whisper-cli.'
      }
    ],
    win32: [
      {
        id: 'bundled-ffmpeg',
        status: 'ready',
        detail: 'Repository now bundles bin/ffmpeg.exe for Windows recording.'
      },
      {
        id: 'bundled-whisper-cli',
        status: 'ready',
        detail: 'Repository now bundles bin/whisper-cli.exe with the required ggml/whisper DLLs for Windows.'
      }
    ]
  }
});

function matchesPackagedPlatform(entry, platform) {
  if (!platform) {
    return true;
  }

  return Array.isArray(entry.packagedPlatforms)
    ? entry.packagedPlatforms.includes(platform)
    : true;
}

function cloneEntry(entry) {
  return JSON.parse(JSON.stringify(entry));
}

function getBuilderFilter(builderConfig, platform) {
  if (!builderConfig || !builderConfig.filters) {
    return ['**/*'];
  }

  return builderConfig.filters[platform] || builderConfig.filters.default || ['**/*'];
}

function getBundledBinary(binaryId, runtimeEnv = {}) {
  const binary = DISTRIBUTION_MANIFEST.bundledBinaries[binaryId];
  if (!binary) {
    throw new Error(`Unknown bundled binary: ${binaryId}`);
  }

  if (runtimeEnv.isPackaged && !matchesPackagedPlatform(binary, runtimeEnv.platform)) {
    throw new Error(`Packaged binary ${binaryId} is not declared for platform ${runtimeEnv.platform}`);
  }

  return {
    id: binary.id,
    relativePath: binary.relativePaths[runtimeEnv.platform] || binary.relativePaths.default,
    packaged: binary.packaged
  };
}

function getPackagedAsset(assetId, runtimeEnv = {}) {
  const asset = DISTRIBUTION_MANIFEST.packagedAssets.find((entry) => entry.id === assetId);
  if (!asset) {
    throw new Error(`Unknown packaged asset: ${assetId}`);
  }

  if (!matchesPackagedPlatform(asset, runtimeEnv.platform)) {
    throw new Error(`Packaged asset ${assetId} is not declared for platform ${runtimeEnv.platform}`);
  }

  return cloneEntry(asset);
}

function listPackagedAssets(runtimeEnv = {}) {
  return DISTRIBUTION_MANIFEST.packagedAssets
    .filter((asset) => matchesPackagedPlatform(asset, runtimeEnv.platform))
    .map((asset) => cloneEntry(asset));
}

function getInstallerPrerequisites(platform) {
  const prerequisites = DISTRIBUTION_MANIFEST.installerPrerequisites[platform] || [];
  return prerequisites.map((entry) => cloneEntry(entry));
}

function listElectronBuilderExtraResources(platform) {
  return listPackagedAssets({ platform })
    .filter((asset) => asset.packagedByDefault !== false)
    .map((asset) => ({
      from: asset.builder.from,
      to: asset.builder.to,
      filter: [...getBuilderFilter(asset.builder, platform)]
    }));
}

module.exports = {
  DISTRIBUTION_MANIFEST,
  getBundledBinary,
  getInstallerPrerequisites,
  listElectronBuilderExtraResources,
  getPackagedAsset,
  listPackagedAssets
};
