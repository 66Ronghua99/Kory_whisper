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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeConfigSections(base, override) {
  if (override === undefined || override === null) {
    return base;
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

function resolveConfigProfileDefaults(options = {}) {
  const platform =
    options.platform ||
    options.profile?.platform ||
    options.runtimeEnv?.platform ||
    process.platform;
  const platformDefaults = PLATFORM_PROFILE_DEFAULTS[platform] || {};
  const explicitProfileDefaults = options.profile?.configDefaults || options.profileDefaults || {};

  return mergeConfigSections(platformDefaults, explicitProfileDefaults);
}

module.exports = {
  PLATFORM_PROFILE_DEFAULTS,
  resolveConfigProfileDefaults
};
