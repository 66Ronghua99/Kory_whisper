const PLATFORM_PROFILE_DEFAULTS = Object.freeze({
  darwin: {
    shortcut: {
      key: 'RIGHT COMMAND'
    },
    input: {
      method: 'applescript'
    }
  },
  win32: {
    shortcut: {
      key: 'RIGHT CONTROL'
    },
    input: {
      method: 'clipboard'
    }
  }
});
const SAFE_FALLBACK_PROFILE_DEFAULTS = PLATFORM_PROFILE_DEFAULTS.darwin;
const darwinProfile = require('../platform/profiles/darwin-profile');
const win32Profile = require('../platform/profiles/win32-profile');
const PLATFORM_PROFILE_UI_CONTRACTS = Object.freeze({
  darwin: darwinProfile.uiContract,
  win32: win32Profile.uiContract
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeConfigSections(base, override) {
  if (override === undefined) {
    return base;
  }

  if (override === null) {
    return null;
  }

  if (Array.isArray(base) || Array.isArray(override)) {
    return Array.isArray(override) ? override : base;
  }

  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }

  const merged = { ...base };
  for (const key of Object.keys(override)) {
    merged[key] = mergeConfigSections(base[key], override[key]);
  }

  return merged;
}

function deriveUiContractDefaults(profile = null, platform = null) {
  const profileObject = profile && typeof profile === 'object' ? profile : null;
  const uiContract = profileObject?.uiContract || (profileObject === null ? PLATFORM_PROFILE_UI_CONTRACTS[platform] : null) || {};
  const derivedDefaults = {};

  if (uiContract.shortcut && uiContract.shortcut.defaultKey) {
    derivedDefaults.shortcut = {
      key: uiContract.shortcut.defaultKey
    };
  }

  if (uiContract.audioCues) {
    const audioCuesSupported = uiContract.audioCues.supported !== false;
    derivedDefaults.audioCues = {
      enabled: audioCuesSupported,
      recordingStartSound: audioCuesSupported
        ? uiContract.audioCues.defaultRecordingStartSound ?? null
        : null,
      outputReadySound: audioCuesSupported
        ? uiContract.audioCues.defaultOutputReadySound ?? null
        : null
    };
  }

  return derivedDefaults;
}

function resolveConfigProfileDefaults(options = {}) {
  const platform =
    options.platform ||
    options.profile?.platform ||
    options.runtimeEnv?.platform ||
    process.platform;
  const platformDefaults = PLATFORM_PROFILE_DEFAULTS[platform] || SAFE_FALLBACK_PROFILE_DEFAULTS;
  const uiContractDefaults = deriveUiContractDefaults(options.profile, platform);
  const explicitProfileDefaults = options.profile?.configDefaults || options.profileDefaults || {};

  return mergeConfigSections(platformDefaults, mergeConfigSections(uiContractDefaults, explicitProfileDefaults));
}

module.exports = {
  mergeConfigSections,
  PLATFORM_PROFILE_DEFAULTS,
  SAFE_FALLBACK_PROFILE_DEFAULTS,
  deriveUiContractDefaults,
  resolveConfigProfileDefaults
};
