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

function resolvePlatform(platformName = process.platform) {
  if (!PLATFORM_REGISTRY[platformName]) {
    throw new Error(
      `Unsupported platform: ${platformName}. Supported platforms: ${Object.keys(PLATFORM_REGISTRY).join(', ')}`
    );
  }

  const resolvedPlatform = platformName;
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

let defaultPlatformApi = null;

function getDefaultPlatformApi() {
  if (!defaultPlatformApi) {
    defaultPlatformApi = createPlatformApi();
  }

  return defaultPlatformApi;
}

const platformExports = {
  createPlatformApi,
  resolvePlatform,
  getAudioRecorder(adapterOptions) {
    return getDefaultPlatformApi().getAudioRecorder(adapterOptions);
  },
  getInputSimulator(adapterOptions) {
    return getDefaultPlatformApi().getInputSimulator(adapterOptions);
  },
  getAudioCuePlayer(adapterOptions) {
    return getDefaultPlatformApi().getAudioCuePlayer(adapterOptions);
  },
  getPermissionGateway(adapterOptions) {
    return getDefaultPlatformApi().getPermissionGateway(adapterOptions);
  }
};

for (const propertyName of [
  'platform',
  'resolvedPlatform',
  'isMac',
  'isWindows',
  'isLinux',
  'profile',
  'capabilities',
  'adapterFamily'
]) {
  Object.defineProperty(platformExports, propertyName, {
    enumerable: true,
    get() {
      return getDefaultPlatformApi()[propertyName];
    }
  });
}

module.exports = platformExports;
