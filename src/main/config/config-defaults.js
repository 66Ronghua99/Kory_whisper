const os = require('os');

const {
  getSharedAppDir,
  getSharedModelPath,
  getSharedModelsDir,
  joinPathSegments
} = require('../shared/model-paths');

function createConfigDefaults(options = {}) {
  const runtimeEnv = options.runtimeEnv || {};
  const homeDir = options.homeDir || runtimeEnv.homeDir || os.homedir();
  const configDir = options.configDir || getSharedAppDir({ homeDir });
  const vocabPath = options.vocabPath || joinPathSegments([configDir, 'vocabulary.json'], [configDir]);

  return {
    shortcut: {
      longPressDuration: 500,
      enabled: true
    },
    audio: {
      sampleRate: 16000,
      device: 'default'
    },
    audioCues: {
      enabled: false,
      recordingStartSound: null,
      outputReadySound: null
    },
    whisper: {
      model: 'base',
      modelPath: getSharedModelPath('ggml-base.bin', { homeDir }),
      modelStorageHint: `Speech models live in the shared model store at ${getSharedModelsDir({ homeDir })}. Repository-local models/ is not the runtime source of truth.`,
      language: 'zh',
      prompt: '',
      outputScript: 'simplified',
      enablePunctuation: true,
      llm: {
        enabled: false,
        provider: 'local',
        local: {
          modelPath: './models/qwen2.5-0.5b-instruct-q3_k_m.gguf',
          timeoutMs: 3000,
          maxTokens: 240,
          port: 18080
        },
        remote: {
          endpoint: 'https://api.openai.com/v1/chat/completions',
          model: 'gpt-4o-mini',
          timeoutMs: 1200,
          minChars: 18,
          maxChars: 180,
          temperature: 0.1,
          apiKeyEnv: 'KORY_LLM_API_KEY',
          apiKey: ''
        }
      }
    },
    vocabulary: {
      enabled: true,
      path: vocabPath
    },
    postProcessing: {
      enabled: true,
      pipeline: 'default',
      stages: {
        basicItn: true,
        disfluencyCleanup: true,
        scriptNormalization: true,
        vocabularyReplacement: true,
        punctuation: true
      }
    },
    input: {
      appendSpace: true,
      autoPunctuation: false
    }
  };
}

module.exports = {
  createConfigDefaults
};
