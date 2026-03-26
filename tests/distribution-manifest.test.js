const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const electronBuilderConfig = require('../electron-builder.config.js');
const packageJson = require('../package.json');
const {
  getBundledBinary,
  getInstallerPrerequisites,
  listElectronBuilderExtraResources,
  listPackagedAssets
} = require('../src/main/distribution/distribution-manifest.js');
const {
  resolveBundledBinaryPath,
  resolvePackagedAssetPath
} = require('../src/main/distribution/bundled-assets.js');

test('distribution manifest centralizes bundled binary naming and packaged assets', () => {
  assert.deepEqual(getBundledBinary('ffmpeg', { platform: 'win32' }), {
    id: 'ffmpeg',
    relativePath: 'bin/ffmpeg.exe',
    packaged: true
  });

  assert.deepEqual(getBundledBinary('whisper-cli', { platform: 'darwin' }), {
    id: 'whisper-cli',
    relativePath: 'bin/whisper-cli',
    packaged: true
  });

  assert.deepEqual(getBundledBinary('whisper-cli', { platform: 'win32' }), {
    id: 'whisper-cli',
    relativePath: 'bin/whisper-cli.exe',
    packaged: true
  });

  assert.deepEqual(
    listPackagedAssets().map((asset) => asset.id),
    ['bin', 'models']
  );

  assert.deepEqual(
    listPackagedAssets({ platform: 'darwin' }).map((asset) => asset.id),
    ['bin', 'models']
  );
  assert.deepEqual(
    listPackagedAssets({ platform: 'win32' }).map((asset) => asset.id),
    ['bin', 'models']
  );
});

test('distribution manifest keeps packaged whisper support explicit for darwin and win32', () => {
  assert.deepEqual(
    getInstallerPrerequisites('darwin').map(({ id, status }) => ({ id, status })),
    [{ id: 'bundled-whisper-cli', status: 'ready' }]
  );
  assert.deepEqual(
    getInstallerPrerequisites('win32').map(({ id, status }) => ({ id, status })),
    [
      { id: 'bundled-ffmpeg', status: 'ready' },
      { id: 'bundled-whisper-cli', status: 'ready' }
    ]
  );
  assert.deepEqual(
    getBundledBinary('whisper-cli', { platform: 'win32', isPackaged: true }),
    {
      id: 'whisper-cli',
      relativePath: 'bin/whisper-cli.exe',
      packaged: true
    }
  );
});

test('distribution manifest keeps the packaged win32 prerequisite aligned with the bundled repo files', () => {
  const repoFfmpegPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');
  const repoBinaryPath = path.join(__dirname, '..', 'bin', 'whisper-cli.exe');
  const repoDllPaths = [
    path.join(__dirname, '..', 'bin', 'whisper.dll'),
    path.join(__dirname, '..', 'bin', 'ggml.dll'),
    path.join(__dirname, '..', 'bin', 'ggml-base.dll'),
    path.join(__dirname, '..', 'bin', 'ggml-cpu.dll')
  ];

  assert.equal(fs.existsSync(repoFfmpegPath), true);
  assert.equal(fs.existsSync(repoBinaryPath), true);
  assert.deepEqual(repoDllPaths.map((entry) => fs.existsSync(entry)), [true, true, true, true]);
  assert.deepEqual(
    getInstallerPrerequisites('win32').map(({ id, status, detail }) => ({ id, status, detail })),
    [
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
  );
});

test('electron-builder config sources platform resource slots from the distribution manifest', () => {
  assert.equal('build' in packageJson, false);
  assert.equal(
    packageJson.scripts.build,
    'electron-builder --config electron-builder.config.js'
  );
  assert.equal(
    packageJson.scripts['build:win:dir'],
    'electron-builder --config electron-builder.config.js --win --dir'
  );
  assert.equal(
    packageJson.scripts['build:win:release'],
    'electron-builder --config electron-builder.config.js --win nsis --publish never'
  );
  assert.equal(
    electronBuilderConfig.mac.entitlements,
    'build/entitlements.mac.plist'
  );
  assert.equal(
    electronBuilderConfig.mac.entitlementsInherit,
    'build/entitlements.mac.plist'
  );
  assert.deepEqual(
    electronBuilderConfig.mac.extraResources,
    listElectronBuilderExtraResources('darwin')
  );
  assert.deepEqual(
    electronBuilderConfig.win.extraResources,
    listElectronBuilderExtraResources('win32')
  );
  assert.equal(
    electronBuilderConfig.mac.icon,
    'build/icon.png'
  );
  assert.equal(
    electronBuilderConfig.win.icon,
    'build/icon.png'
  );
  assert.equal(
    electronBuilderConfig.win.signAndEditExecutable,
    false
  );
});

test('electron-builder build resources exist for app icons and mac entitlements', () => {
  assert.equal(
    fs.existsSync(path.join(__dirname, '..', 'build', 'icon.png')),
    true
  );
  assert.equal(
    fs.existsSync(path.join(__dirname, '..', 'build', 'entitlements.mac.plist')),
    true
  );
});

test('distribution manifest darwin packaged binary maps to a file that exists in this worktree', () => {
  const binary = getBundledBinary('whisper-cli', { platform: 'darwin', isPackaged: true });
  const repoBinaryPath = path.join(__dirname, '..', binary.relativePath);

  assert.equal(fs.existsSync(repoBinaryPath), true);
});

test('bundled asset helpers stay aligned with packaged runtime path resolution', () => {
  const runtimeEnv = {
    platform: 'darwin',
    isPackaged: true,
    appPath: '/Applications/Kory Whisper.app/Contents/Resources/app.asar',
    resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources'
  };

  assert.equal(
    resolveBundledBinaryPath('whisper-cli', runtimeEnv),
    '/Applications/Kory Whisper.app/Contents/Resources/bin/whisper-cli'
  );
  assert.equal(
    resolvePackagedAssetPath('models', runtimeEnv),
    '/Applications/Kory Whisper.app/Contents/Resources/models'
  );
});

test('bundled asset helpers resolve packaged win32 whisper-cli.exe explicitly and keep assets aligned', () => {
  assert.equal(
    resolvePackagedAssetPath('models', {
      platform: 'win32',
      isPackaged: true,
      appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
      resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources'
    }),
    'C:\\Program Files\\Kory Whisper\\resources\\models'
  );

  assert.equal(
    resolveBundledBinaryPath('whisper-cli', {
      platform: 'win32',
      isPackaged: true,
      appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
      resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources'
    }),
    'C:\\Program Files\\Kory Whisper\\resources\\bin\\whisper-cli.exe'
  );
});

test('electron-builder win32 filters include the whisper companion DLLs required by whisper-cli.exe', () => {
  assert.deepEqual(
    electronBuilderConfig.win.extraResources.find((entry) => entry.to === 'bin').filter,
    ['ffmpeg.exe', 'whisper-cli.exe', 'whisper.dll', 'ggml.dll', 'ggml-base.dll', 'ggml-cpu.dll']
  );
});

test('bundled asset helpers resolve packaged win32 whisper-cli.exe explicitly', () => {
  const runtimeEnv = {
    platform: 'win32',
    isPackaged: true,
    appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
    resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources'
  };

  assert.equal(
    resolveBundledBinaryPath('whisper-cli', runtimeEnv),
    'C:\\Program Files\\Kory Whisper\\resources\\bin\\whisper-cli.exe'
  );
});
