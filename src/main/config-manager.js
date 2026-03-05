/**
 * Deps: fs, path, os
 * Used By: index.js
 * Last Updated: 2026-03-05
 *
 * 配置管理器 - 处理应用配置的加载和保存
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.kory-whisper');
    this.configPath = path.join(this.configDir, 'config.json');
    this.vocabPath = path.join(this.configDir, 'vocabulary.json');
    this.config = null;
  }

  async load() {
    try {
      // 确保配置目录存在
      await fs.mkdir(this.configDir, { recursive: true });

      // 读取或创建配置文件
      try {
        const data = await fs.readFile(this.configPath, 'utf-8');
        this.config = this.mergeWithDefaults(JSON.parse(data));
      } catch (error) {
        // 配置文件不存在，创建默认配置
        this.config = this.getDefaultConfig();
        await this.save(this.config);
      }

      // 确保词表文件存在
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
    return {
      shortcut: {
        key: 'RIGHT COMMAND',
        longPressDuration: 500,
        enabled: true
      },
      audio: {
        sampleRate: 16000,
        device: 'default'
      },
      whisper: {
        model: 'base',
        modelPath: './models/ggml-base.bin',
        language: 'zh',
        prompt: '',
        outputScript: 'simplified',
        enablePunctuation: true,
        llm: {
          enabled: false,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          model: 'gpt-4o-mini',
          timeoutMs: 1200,
          minChars: 18,
          maxChars: 180,
          temperature: 0.1,
          apiKeyEnv: 'KORY_LLM_API_KEY',
          apiKey: ''
        }
      },
      vocabulary: {
        enabled: true,
        path: this.vocabPath
      },
      input: {
        method: 'applescript',
        appendSpace: true,
        autoPunctuation: false
      }
    };
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
