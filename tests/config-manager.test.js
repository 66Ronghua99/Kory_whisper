const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const ConfigManager = require('../src/main/config/config-manager.js');
const { createConfigDefaults } = require('../src/main/config/config-defaults.js');
const {
  resolveConfigProfileDefaults
} = require('../src/main/config/config-profile-defaults.js');
const { createPostProcessingContext } = require('../src/main/post-processing/context.js');

test('base config defaults stay platform-neutral until profile defaults are applied', () => {
  const defaults = createConfigDefaults({
    homeDir: '/tmp/kory-home',
    vocabPath: '/tmp/kory-home/vocabulary.json'
  });

  assert.equal(defaults.shortcut.key, undefined);
  assert.equal(defaults.input.method, undefined);
  assert.equal(defaults.shortcut.longPressDuration, 500);
  assert.equal(defaults.audioCues.recordingStartSound, 'Tink');
  assert.equal(defaults.whisper.modelPath, '/tmp/kory-home/.kory-whisper/models/ggml-base.bin');
  assert.equal(defaults.vocabulary.path, '/tmp/kory-home/vocabulary.json');
});

test('canonical config manager merges platform profile defaults without changing the persisted config shape', () => {
  const darwinConfigManager = new ConfigManager({
    runtimeEnv: {
      platform: 'darwin',
      homeDir: '/tmp/kory-darwin'
    }
  });

  const win32ConfigManager = new ConfigManager({
    runtimeEnv: {
      platform: 'win32',
      homeDir: 'C:\\Users\\tester'
    }
  });

  const darwinDefaults = darwinConfigManager.getDefaultConfig();
  const win32Defaults = win32ConfigManager.getDefaultConfig();

  assert.equal(darwinDefaults.shortcut.key, 'RIGHT COMMAND');
  assert.equal(darwinDefaults.input.method, 'applescript');
  assert.equal(win32Defaults.shortcut.key, 'RIGHT CONTROL');
  assert.equal(win32Defaults.input.method, 'clipboard');
  assert.equal(win32Defaults.shortcut.enabled, true);
  assert.equal(win32Defaults.audioCues.outputReadySound, 'Glass');
  assert.deepEqual(Object.keys(win32Defaults).sort(), Object.keys(darwinDefaults).sort());
});

test('profile defaults can come from explicit profile input instead of hard-coded platform branches', () => {
  const defaults = resolveConfigProfileDefaults({
    runtimeEnv: { platform: 'darwin' },
    profile: {
      configDefaults: {
        shortcut: {
          key: 'F13'
        },
        input: {
          method: 'clipboard'
        }
      }
    }
  });

  assert.deepEqual(defaults, {
    shortcut: {
      key: 'F13'
    },
    input: {
      method: 'clipboard'
    }
  });
});

test('unsupported platforms fall back to safe profile defaults that preserve persisted config shape', () => {
  const configManager = new ConfigManager({
    runtimeEnv: {
      platform: 'linux',
      homeDir: '/tmp/kory-linux'
    }
  });

  const defaults = configManager.getDefaultConfig();

  assert.equal(defaults.shortcut.key, 'RIGHT COMMAND');
  assert.equal(defaults.input.method, 'applescript');
});

test('constructor composes partial runtimeEnv with explicit top-level overrides predictably', () => {
  const configManager = new ConfigManager({
    runtimeEnv: {
      platform: 'win32',
      homeDir: 'C:\\Users\\env-home',
      resourcesPath: 'C:\\env-resources'
    },
    homeDir: '/tmp/override-home',
    resourcesPath: '/tmp/override-resources',
    configDir: '/tmp/custom-config-dir',
    vocabPath: '/tmp/custom-config-dir/custom-vocabulary.json'
  });

  const defaults = configManager.getDefaultConfig();

  assert.equal(configManager.runtimeEnv.platform, 'win32');
  assert.equal(configManager.runtimeEnv.homeDir, '/tmp/override-home');
  assert.equal(configManager.runtimeEnv.resourcesPath, '/tmp/override-resources');
  assert.equal(configManager.configDir, '/tmp/custom-config-dir');
  assert.equal(configManager.configPath, '/tmp/custom-config-dir/config.json');
  assert.equal(configManager.vocabPath, '/tmp/custom-config-dir/custom-vocabulary.json');
  assert.equal(defaults.shortcut.key, 'RIGHT CONTROL');
  assert.equal(defaults.whisper.modelPath, '/tmp/override-home/.kory-whisper/models/ggml-base.bin');
  assert.equal(defaults.vocabulary.path, '/tmp/custom-config-dir/custom-vocabulary.json');
});

test('config manager merges nested overrides without dropping defaults', () => {
  const configManager = new ConfigManager();

  const merged = configManager.mergeWithDefaults({
    whisper: {
      model: 'small',
      llm: {
        enabled: true,
        remote: {
          timeoutMs: 1800
        }
      }
    },
    input: {
      appendSpace: false
    }
  });

  assert.equal(merged.whisper.model, 'small');
  assert.equal(merged.whisper.llm.enabled, true);
  assert.equal(merged.whisper.llm.remote.timeoutMs, 1800);
  assert.equal(merged.whisper.llm.remote.model, 'gpt-4o-mini');
  assert.equal(merged.input.appendSpace, false);
  assert.equal(merged.audioCues.recordingStartSound, 'Tink');
  assert.equal(merged.postProcessing.enabled, true);
  assert.equal(merged.postProcessing.pipeline, 'default');
  assert.equal(merged.postProcessing.stages.basicItn, true);
  assert.equal(merged.postProcessing.stages.disfluencyCleanup, true);
  assert.equal(merged.postProcessing.stages.scriptNormalization, true);
  assert.equal(
    merged.postProcessing.stages.vocabularyReplacement,
    merged.vocabulary.enabled
  );
  assert.equal(
    merged.postProcessing.stages.punctuation,
    merged.whisper.enablePunctuation
  );
});

test('config normalization lets owner toggles disable vocabulary replacement and punctuation stages', () => {
  const configManager = new ConfigManager();
  const merged = configManager.mergeWithDefaults({
    vocabulary: {
      enabled: false
    },
    whisper: {
      enablePunctuation: false
    },
    postProcessing: {
      enabled: true,
      stages: {
        vocabularyReplacement: true,
        punctuation: true
      }
    }
  });

  const context = createPostProcessingContext({
    config: merged
  });

  assert.equal(context.config.vocabulary.enabled, false);
  assert.equal(context.config.whisper.enablePunctuation, false);
  assert.equal(context.config.postProcessing.stages.vocabularyReplacement, false);
  assert.equal(context.config.postProcessing.stages.punctuation, false);
});

test('postProcessing enabled false acts as the top-level kill switch for every stage toggle', () => {
  const configManager = new ConfigManager();
  const merged = configManager.mergeWithDefaults({
    postProcessing: {
      enabled: false,
      stages: {
        scriptNormalization: true,
        vocabularyReplacement: true,
        basicItn: true,
        disfluencyCleanup: true,
        punctuation: true
      }
    }
  });

  const context = createPostProcessingContext({
    config: merged
  });

  assert.equal(context.config.postProcessing.enabled, false);
  assert.deepEqual(context.config.postProcessing.stages, {
    scriptNormalization: false,
    vocabularyReplacement: false,
    basicItn: false,
    disfluencyCleanup: false,
    punctuation: false
  });
});

test('config manager deepMerge prefers override arrays and nullish handling is explicit', () => {
  const configManager = new ConfigManager();

  assert.deepEqual(
    configManager.deepMerge({ words: ['a'] }, { words: ['b'] }),
    { words: ['b'] }
  );
  assert.equal(configManager.deepMerge('base', null), 'base');
  assert.equal(configManager.deepMerge('base', 'override'), 'override');
});

test('config manager loadVocabulary returns an empty list when the vocabulary file is unreadable', async () => {
  const configManager = new ConfigManager();
  configManager.vocabPath = '/path/that/does/not/exist/vocabulary.json';

  const vocabulary = await configManager.loadVocabulary();

  assert.deepEqual(vocabulary, []);
});

test('config manager save and load persist merged config in the configured app directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-config-'));
  const configManager = new ConfigManager();

  configManager.configDir = tempDir;
  configManager.configPath = path.join(tempDir, 'config.json');
  configManager.vocabPath = path.join(tempDir, 'vocabulary.json');

  try {
    await configManager.save({
      shortcut: {
        key: 'LEFT COMMAND'
      },
      audioCues: {
        enabled: false
      }
    });

    const saved = JSON.parse(await fs.readFile(configManager.configPath, 'utf8'));
    assert.equal(saved.shortcut.key, 'LEFT COMMAND');
    assert.equal(saved.audioCues.enabled, false);

    await configManager.load();

    assert.equal(configManager.get().shortcut.key, 'LEFT COMMAND');
    assert.equal(configManager.get().audioCues.enabled, false);
    assert.equal(configManager.getVocabPath(), configManager.vocabPath);

    const vocabFile = JSON.parse(await fs.readFile(configManager.vocabPath, 'utf8'));
    assert.deepEqual(vocabFile, { words: [], replacements: {} });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('first-run load persists profile defaults for darwin and win32 configs', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-profile-defaults-'));
  const darwinDir = path.join(tempDir, 'darwin');
  const win32Dir = path.join(tempDir, 'win32');
  const darwinConfigManager = new ConfigManager({
    runtimeEnv: {
      platform: 'darwin',
      homeDir: path.join(tempDir, 'darwin-home')
    },
    configDir: darwinDir,
    vocabPath: path.join(darwinDir, 'vocabulary.json')
  });
  const win32ConfigManager = new ConfigManager({
    runtimeEnv: {
      platform: 'win32',
      homeDir: path.join(tempDir, 'win32-home')
    },
    configDir: win32Dir,
    vocabPath: path.join(win32Dir, 'vocabulary.json')
  });

  try {
    await darwinConfigManager.load();
    await win32ConfigManager.load();

    const darwinSaved = JSON.parse(await fs.readFile(darwinConfigManager.configPath, 'utf8'));
    const win32Saved = JSON.parse(await fs.readFile(win32ConfigManager.configPath, 'utf8'));

    assert.equal(darwinSaved.shortcut.key, 'RIGHT COMMAND');
    assert.equal(darwinSaved.input.method, 'applescript');
    assert.equal(win32Saved.shortcut.key, 'RIGHT CONTROL');
    assert.equal(win32Saved.input.method, 'clipboard');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('legacy whisper llm config stays inert while postProcessing enabled and outputScript round-trip independently', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-config-'));
  const configManager = new ConfigManager({
    configDir: tempDir,
    vocabPath: path.join(tempDir, 'vocabulary.json')
  });

  const legacyLlm = {
    enabled: true,
    provider: 'remote',
    remote: {
      endpoint: 'https://example.test/v1/chat/completions',
      model: 'legacy-model',
      timeoutMs: 2200,
      minChars: 12,
      maxChars: 144,
      apiKey: 'legacy-key'
    }
  };

  try {
    await configManager.save({
      whisper: {
        outputScript: 'traditional',
        llm: legacyLlm
      },
      postProcessing: {
        enabled: false
      }
    });

    await configManager.load();

    assert.equal(configManager.get().postProcessing.enabled, false);
    assert.equal(configManager.get().whisper.outputScript, 'traditional');
    assert.deepEqual(configManager.get().whisper.llm, {
      ...configManager.getDefaultConfig().whisper.llm,
      ...legacyLlm,
      remote: {
        ...configManager.getDefaultConfig().whisper.llm.remote,
        ...legacyLlm.remote
      }
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
