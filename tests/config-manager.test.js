const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const ConfigManager = require('../src/main/config-manager.js');
const CanonicalConfigManager = require('../src/main/config/config-manager.js');
const { createConfigDefaults } = require('../src/main/config/config-defaults.js');
const {
  resolveConfigProfileDefaults
} = require('../src/main/config/config-profile-defaults.js');

test('top-level config manager stays as a compatibility shim for the canonical config home', () => {
  assert.equal(ConfigManager, CanonicalConfigManager);
});

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
  const darwinConfigManager = new CanonicalConfigManager({
    runtimeEnv: {
      platform: 'darwin',
      homeDir: '/tmp/kory-darwin'
    }
  });

  const win32ConfigManager = new CanonicalConfigManager({
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
