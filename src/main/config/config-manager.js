const fs = require('fs').promises;
const os = require('os');

const { createRuntimeEnv } = require('../runtime/runtime-env');
const { getSharedAppDir, joinPathSegments } = require('../shared/model-paths');
const { createConfigDefaults } = require('./config-defaults');
const { resolveConfigProfileDefaults } = require('./config-profile-defaults');
const { normalizeConfig } = require('../post-processing/context');
const { redactSecrets } = require('../asr/redact-secrets');

function resolveRuntimeEnv(options = {}) {
  const runtimeEnv = options.runtimeEnv || {};

  return createRuntimeEnv({
    app: options.app || runtimeEnv.app,
    appPath: options.appPath || runtimeEnv.appPath,
    arch: options.arch || runtimeEnv.arch,
    homeDir: options.homeDir || runtimeEnv.homeDir,
    isPackaged: options.isPackaged !== undefined ? options.isPackaged : runtimeEnv.isPackaged,
    os: options.os || runtimeEnv.os,
    platform: options.platform || runtimeEnv.platform,
    process: options.process || runtimeEnv.process,
    resourcesPath: options.resourcesPath || runtimeEnv.resourcesPath
  });
}

class ConfigManager {
  constructor(options = {}) {
    this.runtimeEnv = resolveRuntimeEnv({
      ...options,
      homeDir: options.homeDir || options.runtimeEnv?.homeDir || os.homedir()
    });
    this.profile = options.profile || null;
    this.configDir = options.configDir || getSharedAppDir({ homeDir: this.runtimeEnv.homeDir });
    this.configPath = options.configPath || joinPathSegments([this.configDir, 'config.json'], [this.configDir]);
    this.vocabPath = options.vocabPath || joinPathSegments([this.configDir, 'vocabulary.json'], [this.configDir]);
    this.profileDefaults = resolveConfigProfileDefaults({
      runtimeEnv: this.runtimeEnv,
      profile: this.profile,
      profileDefaults: options.profileDefaults
    });
    this.config = null;
  }

  async load() {
    try {
      await fs.mkdir(this.configDir, { recursive: true });

      try {
        const data = await fs.readFile(this.configPath, 'utf-8');
        this.config = this.mergeWithDefaults(JSON.parse(data));
      } catch {
        this.config = this.getDefaultConfig();
        await this.save(this.config);
      }

      try {
        await fs.access(this.vocabPath);
      } catch {
        await fs.writeFile(
          this.vocabPath,
          JSON.stringify({ words: [], replacements: {} }, null, 2),
          'utf-8'
        );
      }

      console.log('[Config] Loaded config from:', this.configPath);
    } catch (error) {
      console.error('[Config] Failed to load config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  get() {
    return this.config || this.getDefaultConfig();
  }

  async save(config) {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      this.config = this.mergeWithDefaults(config);
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
      console.log('[Config] Saved config to:', this.configPath);
    } catch (error) {
      console.error('[Config] Failed to save config:', error);
      throw error;
    }
  }

  getVocabPath() {
    return this.vocabPath;
  }

  async loadVocabulary() {
    try {
      const data = await fs.readFile(this.vocabPath, 'utf-8');
      const vocab = JSON.parse(data);
      return vocab.words || [];
    } catch (error) {
      console.error('[Config] Failed to load vocabulary:', error);
      return [];
    }
  }

  getDefaultConfig() {
    return this.deepMerge(
      createConfigDefaults({
        configDir: this.configDir,
        homeDir: this.runtimeEnv.homeDir,
        runtimeEnv: this.runtimeEnv,
        vocabPath: this.vocabPath
      }),
      this.profileDefaults
    );
  }

  mergeWithDefaults(config = {}) {
    const merged = this.deepMerge(this.getDefaultConfig(), config);
    const normalizedPostProcessing = normalizeConfig(merged, {
      effectiveStageToggles: false
    });

    return {
      ...merged,
      whisper: normalizedPostProcessing.whisper,
      vocabulary: normalizedPostProcessing.vocabulary,
      postProcessing: normalizedPostProcessing.postProcessing
    };
  }

  mergeRendererPatch(currentConfig = {}, patch = {}) {
    return this.mergeConfigPatch(currentConfig, patch);
  }

  sanitizeForRenderer(config = {}) {
    const sanitized = this.mergeConfigPatch({}, config);

    if (sanitized.whisper && Object.prototype.hasOwnProperty.call(sanitized.whisper, 'llm')) {
      delete sanitized.whisper.llm;
    }

    return redactSecrets(sanitized);
  }

  deepMerge(base, override) {
    if (override === undefined || override === null) {
      return base;
    }

    if (Array.isArray(base) || Array.isArray(override)) {
      return Array.isArray(override) ? override : base;
    }

    if (typeof base !== 'object' || typeof override !== 'object') {
      return override;
    }

    const merged = { ...base };
    for (const key of Object.keys(override)) {
      merged[key] = this.deepMerge(base[key], override[key]);
    }
    return merged;
  }

  mergeConfigPatch(currentConfig = {}, patch = {}) {
    if (patch === undefined || patch === null) {
      return currentConfig;
    }

    if (Array.isArray(patch) || typeof patch !== 'object') {
      return patch;
    }

    if (!currentConfig || typeof currentConfig !== 'object' || Array.isArray(currentConfig)) {
      return { ...patch };
    }

    const merged = { ...currentConfig };

    for (const key of Object.keys(patch)) {
      merged[key] = this.mergeConfigPatch(currentConfig[key], patch[key]);
    }

    return merged;
  }
}

module.exports = ConfigManager;
