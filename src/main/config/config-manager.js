const fs = require('fs').promises;
const os = require('os');

const { createRuntimeEnv } = require('../runtime/runtime-env');
const { getSharedAppDir, joinPathSegments } = require('../shared/model-paths');
const { createConfigDefaults } = require('./config-defaults');
const { resolveConfigProfileDefaults } = require('./config-profile-defaults');

class ConfigManager {
  constructor(options = {}) {
    this.runtimeEnv = options.runtimeEnv || createRuntimeEnv({
      app: options.app,
      homeDir: options.homeDir || os.homedir(),
      isPackaged: options.isPackaged,
      platform: options.platform,
      resourcesPath: options.resourcesPath
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
    return this.deepMerge(this.getDefaultConfig(), config);
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
}

module.exports = ConfigManager;
