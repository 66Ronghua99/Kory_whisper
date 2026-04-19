const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  createRuntimePaths,
  resolveFfmpegBinaryPath,
  resolveWhisperBinaryPath
} = require('../src/main/runtime/runtime-paths.js');

test('createRuntimePaths resolves packaged darwin binaries and shared directories', () => {
  const runtimePaths = createRuntimePaths({
    runtimeEnv: {
      platform: 'darwin',
      arch: 'arm64',
      isPackaged: true,
      appPath: '/Applications/Kory Whisper.app/Contents/Resources/app.asar',
      resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources',
      homeDir: '/Users/tester'
    }
  });

  assert.deepEqual(runtimePaths.runtimeFacts.platform, {
    isMac: true,
    isWindows: false,
    isLinux: false
  });
  assert.equal('capabilities' in runtimePaths, false);
  assert.equal(
    runtimePaths.whisperBinPath,
    '/Applications/Kory Whisper.app/Contents/Resources/bin/whisper-cli'
  );
  assert.equal(runtimePaths.sharedAppDir, '/Users/tester/.kory-whisper');
  assert.equal(runtimePaths.sharedModelsDir, '/Users/tester/.kory-whisper/models');
  assert.equal(runtimePaths.sharedDebugCapturesDir, '/Users/tester/.kory-whisper/debug-captures');
  assert.equal(
    runtimePaths.getSharedModelPath('ggml-base.bin'),
    '/Users/tester/.kory-whisper/models/ggml-base.bin'
  );
  assert.equal(
    runtimePaths.getBundledModelPath('ggml-base.bin'),
    '/Applications/Kory Whisper.app/Contents/Resources/models/ggml-base.bin'
  );
});

test('createRuntimePaths resolves development win32 binary naming with the executable suffix', () => {
  const runtimePaths = createRuntimePaths({
    runtimeEnv: {
      platform: 'win32',
      arch: 'x64',
      isPackaged: false,
      appPath: 'C:\\repo\\Kory_whisper',
      resourcesPath: 'C:\\repo\\Kory_whisper\\dist\\resources',
      homeDir: 'C:\\Users\\tester'
    }
  });

  assert.equal(
    runtimePaths.ffmpegBinPath,
    'C:\\repo\\Kory_whisper\\bin\\ffmpeg.exe'
  );
  assert.equal(
    runtimePaths.whisperBinPath,
    'C:\\repo\\Kory_whisper\\bin\\whisper-cli.exe'
  );
  assert.equal(runtimePaths.sharedAppDir, 'C:\\Users\\tester\\.kory-whisper');
  assert.equal(runtimePaths.sharedModelsDir, 'C:\\Users\\tester\\.kory-whisper\\models');
  assert.equal(runtimePaths.getBundledModelPath('ggml-base.bin'), null);
});

test('createRuntimePaths resolves packaged win32 whisper-cli.exe explicitly from repository-managed assets', () => {
  const runtimePaths = createRuntimePaths({
    runtimeEnv: {
      platform: 'win32',
      arch: 'x64',
      isPackaged: true,
      appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
      resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources',
      homeDir: 'C:\\Users\\tester'
    }
  });

  assert.equal(
    runtimePaths.ffmpegBinPath,
    'C:\\Program Files\\Kory Whisper\\resources\\bin\\ffmpeg.exe'
  );
  assert.equal(
    runtimePaths.whisperBinPath,
    'C:\\Program Files\\Kory Whisper\\resources\\bin\\whisper-cli.exe'
  );
});

test('createRuntimePaths does not fall back to PATH discovery for packaged win32 whisper-cli.exe resolution', () => {
  const runtimePaths = createRuntimePaths({
    runtimeEnv: {
      platform: 'win32',
      arch: 'x64',
      isPackaged: true,
      appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
      resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources',
      homeDir: 'C:\\Users\\tester'
    }
  });

  assert.equal(runtimePaths.whisperBinPath, 'C:\\Program Files\\Kory Whisper\\resources\\bin\\whisper-cli.exe');
  assert.equal(runtimePaths.ffmpegBinPath, 'C:\\Program Files\\Kory Whisper\\resources\\bin\\ffmpeg.exe');
  assert.notEqual(runtimePaths.whisperBinPath, 'whisper-cli.exe');
  assert.notEqual(runtimePaths.whisperBinPath, 'whisper-cli');
});

test('resolveFfmpegBinaryPath resolves the repository-managed Windows ffmpeg executable explicitly', () => {
  assert.equal(
    resolveFfmpegBinaryPath({
      platform: 'win32',
      isPackaged: true,
      appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
      resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources'
    }),
    'C:\\Program Files\\Kory Whisper\\resources\\bin\\ffmpeg.exe'
  );
});

test('resolveWhisperBinaryPath resolves the repository-managed Windows whisper executable explicitly', () => {
  assert.equal(
    resolveWhisperBinaryPath({
      platform: 'win32',
      isPackaged: true,
      appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
      resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources'
    }),
    'C:\\Program Files\\Kory Whisper\\resources\\bin\\whisper-cli.exe'
  );
});

test('createRuntimePaths keeps the repository truth honest when packaged win32 whisper-cli.exe is present', () => {
  const repoBinaryPath = path.join(__dirname, '..', 'bin', 'whisper-cli.exe');
  const repoFfmpegPath = path.join(__dirname, '..', 'bin', 'ffmpeg.exe');

  assert.equal(fs.existsSync(repoBinaryPath), true);
  assert.equal(fs.existsSync(repoFfmpegPath), true);
  assert.equal(
    createRuntimePaths({
      runtimeEnv: {
        platform: 'win32',
        arch: 'x64',
        isPackaged: true,
        appPath: 'C:\\Program Files\\Kory Whisper\\resources\\app.asar',
        resourcesPath: 'C:\\Program Files\\Kory Whisper\\resources',
        homeDir: 'C:\\Users\\tester'
      }
    }).whisperBinPath,
    'C:\\Program Files\\Kory Whisper\\resources\\bin\\whisper-cli.exe'
  );
});
