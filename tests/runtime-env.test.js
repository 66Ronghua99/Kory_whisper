const test = require('node:test');
const assert = require('node:assert/strict');

const { createRuntimeEnv } = require('../src/main/runtime/runtime-env.js');
const { getRuntimeFacts } = require('../src/main/runtime/runtime-capabilities.js');

test('createRuntimeEnv resolves packaged runtime facts from injected Electron state', () => {
  const runtimeEnv = createRuntimeEnv({
    app: {
      isPackaged: true,
      getAppPath: () => '/Applications/Kory Whisper.app/Contents/Resources/app.asar'
    },
    process: {
      platform: 'darwin',
      arch: 'arm64',
      resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources'
    },
    os: {
      homedir: () => '/Users/tester'
    }
  });

  assert.deepEqual(runtimeEnv, {
    platform: 'darwin',
    arch: 'arm64',
    isPackaged: true,
    appPath: '/Applications/Kory Whisper.app/Contents/Resources/app.asar',
    resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources',
    homeDir: '/Users/tester'
  });
});

test('runtime-capabilities narrows to runtime facts instead of platform policy declarations', () => {
  assert.equal(typeof getRuntimeFacts, 'function');

  const runtimeFacts = getRuntimeFacts({
    platform: 'darwin',
    isPackaged: true,
    resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources',
    homeDir: '/Users/tester'
  });

  assert.deepEqual(runtimeFacts.platform, {
    isMac: true,
    isWindows: false,
    isLinux: false
  });
  assert.deepEqual(runtimeFacts.packaging, {
    isPackaged: true,
    hasResourcesPath: true,
    hasBundledAssets: true
  });
  assert.deepEqual(runtimeFacts.directories, {
    hasHomeDir: true
  });
  assert.equal(runtimeFacts.audioCues, undefined);
  assert.equal(runtimeFacts.permissionSurfaces, undefined);
  assert.equal(runtimeFacts.packagedAssetExpectations, undefined);
});
