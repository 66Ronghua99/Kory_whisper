const test = require('node:test');
const assert = require('node:assert/strict');

const PostProcessorPipeline = require('../src/main/post-processing/pipeline.js');
const { createPostProcessingContext } = require('../src/main/post-processing/context.js');
const createDefaultPipeline = require('../src/main/post-processing/create-default-pipeline.js');
const createScriptNormalizationStage = require('../src/main/post-processing/stages/script-normalization.js');
const createVocabularyReplacementStage = require('../src/main/post-processing/stages/vocabulary-replacement.js');
const createBasicItnStage = require('../src/main/post-processing/stages/basic-itn.js');
const createDisfluencyCleanupStage = require('../src/main/post-processing/stages/disfluency-cleanup.js');
const createPunctuationStage = require('../src/main/post-processing/stages/punctuation.js');

test('default pipeline registers the v1 stage sequence in a stable order', () => {
  const pipeline = createDefaultPipeline();

  assert.deepEqual(
    pipeline.stages.map((stage) => stage.name),
    [
      'script-normalization',
      'vocabulary-replacement',
      'basic-itn',
      'disfluency-cleanup',
      'punctuation'
    ]
  );
});

test('script normalization preserves the existing simplified chinese output mode', async () => {
  const stage = createScriptNormalizationStage();
  const context = createPostProcessingContext({
    runtime: { language: 'zh', outputScript: 'simplified' }
  });

  const result = await stage.process({ text: '錄音軟體', meta: {} }, context);

  assert.equal(result.text, '录音软件');
});

test('vocabulary replacement respects explicit replacements before generic casing fixes', async () => {
  const stage = createVocabularyReplacementStage();
  const context = createPostProcessingContext({
    vocabulary: {
      replacements: { jmi: 'Gemini' },
      words: ['LLM']
    }
  });

  const result = await stage.process({ text: 'jmi 和 llm', meta: {} }, context);

  assert.equal(result.text, 'Gemini 和 LLM');
});

test('basic ITN normalizes high-value spoken forms without rewriting sentence meaning', async () => {
  const stage = createBasicItnStage();
  const context = createPostProcessingContext({});

  const result = await stage.process({ text: '今天百分之十五，llm 在三点二版本', meta: {} }, context);

  assert.equal(result.text, '今天15%，LLM 在3.2版本');
});

test('disfluency cleanup removes obvious filler and adjacent repetition conservatively', async () => {
  const stage = createDisfluencyCleanupStage();
  const context = createPostProcessingContext({});

  const result = await stage.process({ text: '那个那个 我觉得 我觉得这个可以', meta: {} }, context);

  assert.equal(result.text, '我觉得这个可以');
});

test('punctuation stage protects technical spans while still punctuating surrounding chinese text', async () => {
  const stage = createPunctuationStage();
  const context = createPostProcessingContext({
    runtime: { language: 'zh' }
  });

  const versionResult = await stage.process({
    text: '请看版本 1.2.3 然后同步结果',
    meta: {}
  }, context);
  const localhostResult = await stage.process({
    text: '请访问 localhost:3000 然后点击保存',
    meta: {}
  }, context);

  assert.equal(versionResult.text, '请看版本 1.2.3，然后同步结果。');
  assert.equal(localhostResult.text, '请访问 localhost:3000，然后点击保存。');
});

test('pipeline keeps the last-known-good text when a stage fails', async () => {
  const pipeline = new PostProcessorPipeline({
    stages: [
      {
        name: 'prefix',
        process: async ({ text }) => ({ text: `${text}A`, meta: {} })
      },
      {
        name: 'boom',
        process: async () => {
          throw new Error('broken');
        }
      },
      {
        name: 'suffix',
        process: async ({ text }) => ({ text: `${text}B`, meta: {} })
      }
    ]
  });

  const result = await pipeline.process('seed', createPostProcessingContext({}));

  assert.equal(result.text, 'seedAB');
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].stage, 'boom');
});
