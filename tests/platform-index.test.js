const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

const platform = require('../src/main/platform/index.js');
const darwinProfile = require('../src/main/platform/profiles/darwin-profile.js');
const win32Profile = require('../src/main/platform/profiles/win32-profile.js');
const DarwinAudioRecorder = require('../src/main/platform/adapters/darwin/audio-recorder.js');
const DarwinInputInjector = require('../src/main/platform/adapters/darwin/input-injector.js');
const DarwinAudioCuePlayer = require('../src/main/platform/adapters/darwin/audio-cue-player.js');
const DarwinPermissionGateway = require('../src/main/platform/adapters/darwin/permission-gateway.js');
const Win32AudioRecorder = require('../src/main/platform/adapters/win32/audio-recorder.js');
const Win32InputInjector = require('../src/main/platform/adapters/win32/input-injector.js');
const Win32AudioCuePlayer = require('../src/main/platform/adapters/win32/audio-cue-player.js');
const Win32PermissionGateway = require('../src/main/platform/adapters/win32/permission-gateway.js');

test('platform selector reports the active runtime platform flags consistently', () => {
  assert.equal(typeof platform.platform, 'string');
  assert.equal(platform.isMac, process.platform === 'darwin');
  assert.equal(platform.isWindows, process.platform === 'win32');
  assert.equal(platform.isLinux, process.platform === 'linux');
});

test('platform entrypoint resolves the darwin profile, adapter family, and capabilities', () => {
  const darwinPlatform = platform.createPlatformApi({ platform: 'darwin' });

  assert.equal(darwinPlatform.platform, 'darwin');
  assert.equal(darwinPlatform.profile, darwinProfile);
  assert.equal(darwinPlatform.capabilities, darwinProfile.capabilities);
  assert.equal(darwinPlatform.capabilities.audioCues.supported, true);
  assert.deepEqual(darwinPlatform.capabilities.permissions.surfaces, ['microphone', 'accessibility']);
  assert.deepEqual(darwinPlatform.adapterFamily, {
    platform: 'darwin',
    audioRecorder: DarwinAudioRecorder,
    inputInjector: DarwinInputInjector,
    audioCuePlayer: DarwinAudioCuePlayer,
    permissionGateway: DarwinPermissionGateway
  });
});

test('platform entrypoint resolves the win32 profile, adapter family, and capabilities', () => {
  const win32Platform = platform.createPlatformApi({ platform: 'win32' });

  assert.equal(win32Platform.platform, 'win32');
  assert.equal(win32Platform.profile, win32Profile);
  assert.equal(win32Platform.capabilities, win32Profile.capabilities);
  assert.equal(win32Platform.capabilities.audioCues.supported, false);
  assert.deepEqual(win32Platform.capabilities.permissions.surfaces, []);
  assert.deepEqual(win32Platform.adapterFamily, {
    platform: 'win32',
    audioRecorder: Win32AudioRecorder,
    inputInjector: Win32InputInjector,
    audioCuePlayer: Win32AudioCuePlayer,
    permissionGateway: Win32PermissionGateway
  });
});

test('platform entrypoint fails fast on unsupported platforms instead of mixing identities', () => {
  assert.throws(
    () => platform.createPlatformApi({ platform: 'linux' }),
    /Unsupported platform: linux/
  );
});

test('platform selector returns adapter instances with the expected public methods', () => {
  const audioCuePlayer = platform.getAudioCuePlayer({ enabled: false });
  const inputSimulator = platform.getInputSimulator({ appendSpace: true });
  const audioRecorder = platform.getAudioRecorder({ sampleRate: 16000, channels: 1 });
  const permissionGateway = platform.getPermissionGateway({
    systemPreferences: {
      getMediaAccessStatus: async () => 'granted',
      askForMediaAccess: async () => true,
      isTrustedAccessibilityClient: () => true,
      openSystemPreferences: () => {}
    }
  });

  assert.equal(typeof audioCuePlayer.playRecordingStart, 'function');
  assert.equal(typeof audioCuePlayer.playOutputReady, 'function');
  assert.equal(typeof inputSimulator.typeText, 'function');
  assert.equal(typeof audioRecorder.start, 'function');
  assert.equal(typeof audioRecorder.stop, 'function');
  assert.equal(typeof permissionGateway.check, 'function');
  assert.equal(typeof permissionGateway.ensure, 'function');
  assert.equal(typeof permissionGateway.openSettings, 'function');
});

test('win32 audio recorder stop resolves even when stdin is unavailable', async () => {
  const recorder = new Win32AudioRecorder();
  const outputPath = path.join(os.tmpdir(), `kory-whisper-win32-stop-${process.pid}-${Date.now()}.wav`);
  fs.writeFileSync(outputPath, 'wav');

  const fakeProcess = new EventEmitter();
  fakeProcess.stdin = null;
  fakeProcess.killed = false;
  fakeProcess.kill = () => {
    fakeProcess.killed = true;
  };

  recorder.outputPath = outputPath;
  recorder.ffmpegProcess = fakeProcess;

  const stopPromise = recorder.stop();
  setImmediate(() => {
    fakeProcess.emit('close', 0);
  });

  const resolvedPath = await stopPromise;
  assert.equal(resolvedPath, outputPath);

  fs.unlinkSync(outputPath);
});
