const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const settingsHtml = fs.readFileSync(
  path.join(__dirname, '../src/renderer/settings.html'),
  'utf8'
);

test('settings html replaces the old llm controls with one top-level ASR post-processing toggle', () => {
  assert.match(settingsHtml, /id="enablePostProcessing"/);
  assert.match(settingsHtml, />启用 ASR 后处理</);
  assert.match(settingsHtml, /id="outputScript"/);
  assert.match(settingsHtml, /id="useVocabulary"/);
  assert.match(settingsHtml, /id="enablePunctuation"/);

  assert.doesNotMatch(settingsHtml, /id="enableLlmPostprocess"/);
  assert.doesNotMatch(settingsHtml, /id="llmModel"/);
  assert.doesNotMatch(settingsHtml, /id="llmApiKey"/);
  assert.doesNotMatch(settingsHtml, /id="llmTimeoutMs"/);
  assert.doesNotMatch(settingsHtml, /id="llmMinChars"/);
  assert.doesNotMatch(settingsHtml, /id="llmMaxChars"/);
});

test('embedded settings script reads and writes postProcessing enabled without using whisper llm', () => {
  assert.match(
    settingsHtml,
    /document\.getElementById\('enablePostProcessing'\)\.checked = config\.postProcessing\?\.enabled !== false;/
  );
  assert.match(
    settingsHtml,
    /postProcessing:\s*\{\s*\.\.\.currentConfig\.postProcessing,\s*enabled: document\.getElementById\('enablePostProcessing'\)\.checked/s
  );

  assert.match(
    settingsHtml,
    /document\.getElementById\('outputScript'\)\.value = config\.whisper\?\.outputScript \|\| 'simplified';/
  );
  assert.match(
    settingsHtml,
    /document\.getElementById\('enablePunctuation'\)\.checked = config\.whisper\?\.enablePunctuation !== false;/
  );
  assert.match(
    settingsHtml,
    /document\.getElementById\('useVocabulary'\)\.checked = config\.vocabulary\?\.enabled !== false;/
  );

  assert.doesNotMatch(settingsHtml, /config\.whisper\?\.llm/);
  assert.doesNotMatch(settingsHtml, /currentConfig\.whisper\?\.llm/);
  assert.doesNotMatch(settingsHtml, /document\.getElementById\('llm/);
});
