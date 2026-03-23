const darwinProfile = require('./profiles/darwin-profile.js');
const win32Profile = require('./profiles/win32-profile.js');

const DarwinAudioRecorder = require('./adapters/darwin/audio-recorder.js');
const DarwinInputInjector = require('./adapters/darwin/input-injector.js');
const DarwinAudioCuePlayer = require('./adapters/darwin/audio-cue-player.js');
const DarwinPermissionGateway = require('./adapters/darwin/permission-gateway.js');
const Win32AudioRecorder = require('./adapters/win32/audio-recorder.js');
const Win32InputInjector = require('./adapters/win32/input-injector.js');
const Win32AudioCuePlayer = require('./adapters/win32/audio-cue-player.js');
const Win32PermissionGateway = require('./adapters/win32/permission-gateway.js');

const PLATFORM_REGISTRY = Object.freeze({
  darwin: Object.freeze({
    profile: darwinProfile,
    adapterFamily: Object.freeze({
      platform: 'darwin',
      audioRecorder: DarwinAudioRecorder,
      inputInjector: DarwinInputInjector,
      audioCuePlayer: DarwinAudioCuePlayer,
      permissionGateway: DarwinPermissionGateway
    })
  }),
  win32: Object.freeze({
    profile: win32Profile,
    adapterFamily: Object.freeze({
      platform: 'win32',
      audioRecorder: Win32AudioRecorder,
      inputInjector: Win32InputInjector,
      audioCuePlayer: Win32AudioCuePlayer,
      permissionGateway: Win32PermissionGateway
    })
  })
});

const DEFAULT_PLATFORM_ID = 'darwin';

function resolvePlatform(platformName = process.platform) {
  const resolvedPlatform = PLATFORM_REGISTRY[platformName] ? platformName : DEFAULT_PLATFORM_ID;
  return {
    requestedPlatform: platformName,
    resolvedPlatform,
    profile: PLATFORM_REGISTRY[resolvedPlatform].profile,
    adapterFamily: PLATFORM_REGISTRY[resolvedPlatform].adapterFamily
  };
}

function createPlatformApi(options = {}) {
  const platformName = typeof options === 'string' ? options : options.platform || process.platform;
  const resolved = resolvePlatform(platformName);

  return {
    platform: platformName,
    resolvedPlatform: resolved.resolvedPlatform,
    isMac: platformName === 'darwin',
    isWindows: platformName === 'win32',
    isLinux: platformName === 'linux',
    profile: resolved.profile,
    capabilities: resolved.profile.capabilities,
    adapterFamily: resolved.adapterFamily,

    getAudioRecorder(adapterOptions) {
      return new resolved.adapterFamily.audioRecorder(adapterOptions);
    },

    getInputSimulator(adapterOptions) {
      return new resolved.adapterFamily.inputInjector(adapterOptions);
    },

    getAudioCuePlayer(adapterOptions) {
      return new resolved.adapterFamily.audioCuePlayer(adapterOptions);
    },

    getPermissionGateway(adapterOptions) {
      return new resolved.adapterFamily.permissionGateway(adapterOptions);
    }
  };
}

module.exports = {
  ...createPlatformApi(),
  createPlatformApi,
  resolvePlatform
};
