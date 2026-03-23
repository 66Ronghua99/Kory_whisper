const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  getBundledBinary,
  listPackagedAssets
} = require('../src/main/distribution/distribution-manifest.js');
const {
  resolveBundledBinaryPath,
  resolvePackagedAssetPath
} = require('../src/main/distribution/bundled-assets.js');

test('distribution manifest centralizes bundled binary naming and packaged assets', () => {
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
});

test('distribution manifest stays honest about the current packaged win32 quadrant', () => {
  assert.throws(
    () => getBundledBinary('whisper-cli', { platform: 'win32', isPackaged: true }),
    /Packaged binary whisper-cli is not declared for platform win32/
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

test('bundled asset helpers fail explicitly for unsupported packaged win32 binaries', () => {
  assert.throws(
    () => resolveBundledBinaryPath('whisper-cli', {
      platform: 'win32',
      isPackaged: true,
      appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
      resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources'
    }),
    /Packaged binary whisper-cli is not declared for platform win32/
  );
});
