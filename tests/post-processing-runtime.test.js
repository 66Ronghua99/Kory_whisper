const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { TranscriptionService } = require('../src/main/services/transcription-service.js');
const { createPostProcessingContext } = require('../src/main/post-processing/context.js');
const PostProcessorPipeline = require('../src/main/post-processing/pipeline.js');
const applyPostProcessing = require('../src/main/post-processing/apply-pipeline.js');
const { loadVocabularyData } = require('../src/main/vocabulary-data.js');

test('loadVocabularyData normalizes shared vocabulary words and replacements', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-vocab-'));
  const vocabPath = path.join(tempDir, 'vocabulary.json');

  await fs.writeFile(vocabPath, JSON.stringify({
    words: [' Gemini ', '', 'LLM'],
    replacements: [
      ['jmi', 'Gemini'],
      { from: 'mini max', to: 'MiniMax' }
    ]
  }), 'utf-8');

  try {
    const vocabularyData = await loadVocabularyData(vocabPath);

    assert.deepEqual(vocabularyData, {
      words: ['Gemini', 'LLM'],
      replacements: {
        jmi: 'Gemini',
        'mini max': 'MiniMax'
      }
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('applyPostProcessing short-circuits empty text and disabled pipeline, and only routes non-empty text through the pipeline once', async () => {
  const calls = [];
  const pipeline = {
    async process(text, context) {
      calls.push({ text, context });
      return { text: `${text}!`, meta: {}, errors: [] };
    }
  };

  const enabledContext = createPostProcessingContext({
    config: { postProcessing: { enabled: true } }
  });
  const disabledContext = createPostProcessingContext({
    config: { postProcessing: { enabled: false } }
  });

  assert.equal(await applyPostProcessing('   ', enabledContext, { pipeline }), '   ');
  assert.equal(await applyPostProcessing('seed', disabledContext, { pipeline }), 'seed');
  assert.equal(await applyPostProcessing('seed', enabledContext, { pipeline }), 'seed!');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].text, 'seed');
});

test('applyPostProcessing returns last-known-good text and logs stage errors', async () => {
  const warnings = [];
  const logger = {
    info() {},
    warn(...args) {
      warnings.push(args.join(' '));
    }
  };
  const pipeline = new PostProcessorPipeline({
    stages: [
      {
        name: 'first',
        process: async ({ text }) => ({ text: `${text}A`, meta: {} })
      },
      {
        name: 'broken',
        process: async () => {
          throw new Error('boom');
        }
      },
      {
        name: 'last',
        process: async ({ text }) => ({ text: `${text}B`, meta: {} })
      }
    ]
  });
  const context = createPostProcessingContext({
    config: { postProcessing: { enabled: true } }
  });

  const result = await applyPostProcessing('seed', context, { pipeline, logger });

  assert.equal(result, 'seedAB');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /broken/);
  assert.match(warnings[0], /boom/);
});

test('transcription service loads vocabulary once and runs the post-processing pipeline after whisper returns raw text', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-postprocess-'));
  const vocabPath = path.join(tempDir, 'vocabulary.json');
  const loadCalls = [];
  const contextInputs = [];
  const applyCalls = [];

  await fs.writeFile(vocabPath, JSON.stringify({
    words: [' Gemini '],
    replacements: {
      jmi: 'Gemini'
    }
  }), 'utf-8');

  try {
    const whisperEngine = {
      async transcribe(audioPath, options) {
        this.audioPath = audioPath;
        this.transcribeOptions = options;
        return 'raw whisper text';
      },
      updateRuntimeOptions(options) {
        this.runtimeOptions = options;
      }
    };

    const service = new TranscriptionService({
      whisperEngine,
      config: {
        whisper: {
          language: 'zh',
          prompt: '已有提示',
          outputScript: 'simplified',
          enablePunctuation: true
        },
        vocabulary: {
          path: vocabPath,
          enabled: true
        },
        postProcessing: {
          enabled: true
        }
      },
      logger: {
        info() {},
        warn() {},
        error() {}
      },
      loadVocabularyData: async (nextVocabPath) => {
        loadCalls.push(nextVocabPath);
        return loadVocabularyData(nextVocabPath);
      },
      createPostProcessingContext(input) {
        contextInputs.push(input);
        return createPostProcessingContext(input);
      },
      applyPostProcessing: async (text, context, options) => {
        applyCalls.push({ text, context, options });
        return 'final text';
      },
      postProcessingPipeline: { name: 'pipeline' }
    });

    const result = await service.transcribe('/tmp/sample.wav');

    assert.equal(result, 'final text');
    assert.equal(loadCalls.length, 1);
    assert.equal(loadCalls[0], vocabPath);
    assert.deepEqual(whisperEngine.transcribeOptions, {
      vocabularyWords: ['Gemini']
    });
    assert.equal(contextInputs.length, 1);
    assert.deepEqual(contextInputs[0].vocabulary, {
      words: ['Gemini'],
      replacements: {
        jmi: 'Gemini'
      }
    });
    assert.equal(applyCalls.length, 1);
    assert.equal(applyCalls[0].text, 'raw whisper text');
    assert.equal(applyCalls[0].options.pipeline.name, 'pipeline');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
