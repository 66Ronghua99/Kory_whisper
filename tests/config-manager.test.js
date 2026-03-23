const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const ConfigManager = require('../src/main/config-manager.js');

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
