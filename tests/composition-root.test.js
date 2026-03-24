const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

const { createCompositionRoot } = require('../src/main/app/composition-root.js');
const { bootstrapApp } = require('../src/main/app/bootstrap.js');
const { registerAppLifecycle } = require('../src/main/app/lifecycle.js');
const {
  TranscriptionService,
  prepareTranscriptionService
} = require('../src/main/services/transcription-service.js');

function createShortcutManagerSpy(events) {
  const shortcutManager = new EventEmitter();
  shortcutManager.start = async () => {
    events.push('shortcut:start');
  };
  shortcutManager.stop = () => {
    events.push('shortcut:stop');
  };
  return shortcutManager;
}

test('composition root wires injected services and drives dictation through shortcut events', async () => {
  const events = [];
  const handlers = {};
  let savedConfig = null;
  let savedTranscriptionConfig = null;

  const shortcutManager = createShortcutManagerSpy(events);
  const trayManager = new EventEmitter();
  trayManager.init = () => {
    events.push('tray:init');
  };
  trayManager.setRecordingState = (isRecording) => {
    events.push(`tray:recording:${isRecording}`);
  };
  trayManager.showProcessingState = () => {
    events.push('tray:processing');
  };
  trayManager.showSuccessState = () => {
    events.push('tray:success');
  };
  trayManager.showErrorState = (message) => {
    events.push(`tray:error:${message}`);
  };
  trayManager.openSettings = () => {
    events.push('tray:open-settings');
  };

  const audioRecorder = {
    async start() {
      events.push('recording:start');
    },
    async stop() {
      events.push('recording:stop');
      return '/tmp/capture.wav';
    }
  };

  const permissionGateway = {
    async check() {
      events.push('permissions:check');
      return {
        microphoneGranted: true,
        accessibilityEnabled: true
      };
    },
    async ensure() {
      events.push('permissions:ensure');
      return {
        microphoneGranted: true,
        accessibilityEnabled: true
      };
    },
    openSettings(surface) {
      events.push(`permissions:open:${surface}`);
    }
  };

  const audioCuePlayer = {
    async playRecordingStart() {
      events.push('cue:recording-start');
    },
    async playOutputReady() {
      events.push('cue:output-ready');
    },
    updateOptions(options) {
      events.push(`cue:update:${options.enabled}`);
    }
  };

  const inputSimulator = {
    appendSpace: true,
    async typeText(text) {
      events.push(`inject:${text}`);
    }
  };

  const transcriptionService = {
    whisperEngine: {
      modelPath: '/models/ggml-base.bin'
    },
    async transcribe(audioPath) {
      events.push(`transcribe:${audioPath}`);
      return 'hello world';
    },
    async applyConfig(config) {
      savedTranscriptionConfig = config;
      events.push(`transcribe:apply:${config.whisper.model}`);
    },
    async dispose() {
      events.push('whisper:stop-server');
    }
  };

  const root = createCompositionRoot({
    app: {
      quit() {
        events.push('app:quit');
      }
    },
    ipcMain: {
      handle(channel, handler) {
        handlers[channel] = handler;
      }
    },
    configManager: {
      get() {
        return {
          shortcut: {
            key: 'RIGHT COMMAND',
            longPressDuration: 500
          },
          input: {
            appendSpace: true
          },
          audioCues: {
            enabled: true
          },
          whisper: {
            model: 'base',
            language: 'zh',
            prompt: ''
          },
          vocabulary: {
            path: '/tmp/vocabulary.json'
          }
        };
      },
      async save(config) {
        savedConfig = config;
        events.push('config:save');
      },
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager,
      trayManager,
      audioRecorder,
      permissionGateway,
      audioCuePlayer,
      inputSimulator
    },
    prepareTranscriptionService: async ({ config, runtimeEnv, runtimePaths }) => {
      events.push(`transcribe:prepare:${config.whisper.model}:${runtimeEnv.platform}:${typeof runtimePaths.getSharedModelPath}`);
      return transcriptionService;
    },
    logger: {
      info() {},
      warn() {},
      error() {}
    },
    runtimeEnv: {
      platform: 'darwin'
    },
    runtimePaths: {
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    }
  });

  await root.initialize();
  assert.deepEqual(Object.keys(root.services).sort(), [
    'cue',
    'dictation',
    'injection',
    'permission',
    'recording',
    'shortcut',
    'transcription',
    'tray'
  ]);
  assert.equal(typeof handlers['get-config'], 'function');
  assert.equal(typeof handlers['save-config'], 'function');

  shortcutManager.emit('longPressStart');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  shortcutManager.emit('longPressEnd');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(events, [
    'transcribe:prepare:base:darwin:function',
    'tray:init',
    'permissions:ensure',
    'shortcut:start',
    'permissions:check',
    'recording:start',
    'tray:recording:true',
    'cue:recording-start',
    'tray:recording:false',
    'tray:processing',
    'recording:stop',
    'transcribe:/tmp/capture.wav',
    'inject:hello world',
    'tray:success',
    'cue:output-ready'
  ]);

  await handlers['save-config'](null, {
    shortcut: {
      key: 'RIGHT COMMAND',
      longPressDuration: 500
    },
    input: {
      appendSpace: false
    },
    audioCues: {
      enabled: false
    },
    whisper: {
      model: 'small',
      language: 'zh',
      prompt: 'next'
    },
    vocabulary: {
      path: '/tmp/alt-vocabulary.json'
    }
  });

  assert.equal(savedConfig.whisper.model, 'small');
  assert.equal(events.includes('cue:update:false'), true);
  assert.equal(events.includes('transcribe:apply:small'), true);
  assert.equal(savedTranscriptionConfig.whisper.model, 'small');

  trayManager.emit('show-settings');
  trayManager.emit('quit');
  await root.dispose();

  assert.equal(events.includes('tray:open-settings'), true);
  assert.equal(events.includes('app:quit'), true);
  assert.equal(events.includes('shortcut:stop'), true);
  assert.equal(events.includes('whisper:stop-server'), true);
});

test('composition root requires injected runtime facts instead of falling back to process.platform', () => {
  assert.throws(
    () => createCompositionRoot({
      runtimePaths: {}
    }),
    /runtimeEnv\.platform/
  );
});

test('prepareTranscriptionService returns null when startup model download is declined', async () => {
  const modelDownloader = {
    async checkModel() {
      return { exists: false, path: '/models/ggml-base.bin' };
    },
    getModelInfo() {
      return { size: '141 MB', desc: 'base model' };
    },
    async seedModelFromPath() {
      return { copied: false, path: '/models/ggml-base.bin', size: 0 };
    }
  };

  const service = await prepareTranscriptionService({
    config: {
      whisper: { model: 'base', language: 'zh' },
      vocabulary: { path: '/tmp/vocabulary.json' }
    },
    dialog: {
      async showMessageBox() {
        return { response: 1 };
      }
    },
    modelDownloader,
    runtimePaths: {
      sharedModelsDir: '/models',
      sharedDebugCapturesDir: '/captures',
      whisperBinPath: '/bin/whisper-cli',
      getBundledModelPath(modelName) {
        return `/bundled/${modelName}`;
      },
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    }
  });

  assert.equal(service, null);
});

test('prepareTranscriptionService switches models through downloader-backed readiness checks', async () => {
  const events = [];
  const availability = new Map([
    ['ggml-base.bin', { exists: true, size: 200 * 1024 * 1024 }],
    ['ggml-small.bin', { exists: false, size: 0 }]
  ]);

  class FakeWhisperEngine {
    constructor(options) {
      this.modelPath = options.modelPath;
      this.vocabPath = options.vocabPath;
      this.language = options.language;
      this.prompt = options.prompt;
      this.outputScript = options.outputScript;
      this.enablePunctuation = options.enablePunctuation;
      events.push(`engine:create:${options.modelPath}`);
    }

    updateRuntimeOptions(options) {
      this.modelPath = options.modelPath;
      this.vocabPath = options.vocabPath;
      this.language = options.language;
      this.prompt = options.prompt;
      this.outputScript = options.outputScript;
      this.enablePunctuation = options.enablePunctuation;
      events.push(`engine:update:${options.modelPath}`);
    }
  }

  const service = await prepareTranscriptionService({
    config: {
      whisper: {
        model: 'base',
        language: 'zh',
        prompt: ''
      },
      vocabulary: {
        path: '/tmp/base-vocabulary.json'
      }
    },
    BrowserWindow: class {
      constructor() {
        this.webContents = {
          send(channel, progress) {
            events.push(`progress:${channel}:${progress}`);
          }
        };
      }

      loadURL() {
        events.push('progress-window:load');
      }

      close() {
        events.push('progress-window:close');
      }
    },
    DebugCaptureStore: class {
      constructor(debugPath) {
        events.push(`captures:${debugPath}`);
      }
    },
    dialog: {
      async showMessageBox() {
        events.push('dialog:show');
        return { response: 0 };
      },
      showErrorBox() {
        events.push('dialog:error');
      }
    },
    modelDownloader: {
      async checkModel(modelName) {
        events.push(`check:${modelName}`);
        return {
          exists: availability.get(modelName).exists,
          size: availability.get(modelName).size,
          path: `/models/${modelName}`
        };
      },
      getModelInfo(modelName) {
        events.push(`info:${modelName}`);
        return { size: modelName, desc: 'model' };
      },
      async seedModelFromPath(sourcePath, modelName) {
        events.push(`seed:${modelName}:${sourcePath}`);
        return { copied: false, size: 0, path: `/models/${modelName}` };
      },
      async downloadModel(modelName, onProgress) {
        events.push(`download:${modelName}`);
        availability.set(modelName, { exists: true, size: 500 * 1024 * 1024 });
        onProgress(50);
      }
    },
    runtimePaths: {
      sharedModelsDir: '/models',
      sharedDebugCapturesDir: '/captures',
      whisperBinPath: '/bin/whisper-cli',
      getBundledModelPath(modelName) {
        return `/bundled/${modelName}`;
      },
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    },
    WhisperEngine: FakeWhisperEngine
  });

  assert.ok(service instanceof TranscriptionService);

  await service.applyConfig({
    whisper: {
      model: 'small',
      language: 'zh',
      prompt: 'next'
    },
    vocabulary: {
      path: '/tmp/small-vocabulary.json'
    }
  });

  assert.deepEqual(events, [
    'check:ggml-base.bin',
    'info:ggml-base.bin',
    'captures:/captures',
    'engine:create:/models/ggml-base.bin',
    'check:ggml-small.bin',
    'info:ggml-small.bin',
    'seed:ggml-small.bin:/bundled/ggml-small.bin',
    'dialog:show',
    'progress-window:load',
    'download:ggml-small.bin',
    'progress:progress:50',
    'progress-window:close',
    'engine:update:/models/ggml-small.bin'
  ]);
});

test('prepareTranscriptionService lets injected whisper engines own their own model lifecycle', async () => {
  const events = [];
  const whisperEngine = {
    modelPath: '/models/ggml-base.bin',
    vocabPath: '/tmp/base-vocabulary.json',
    language: 'zh',
    prompt: '',
    outputScript: 'simplified',
    enablePunctuation: true,
    updateRuntimeOptions(options) {
      this.modelPath = options.modelPath;
      events.push(`engine:update:${options.modelPath}`);
    }
  };

  const service = await prepareTranscriptionService({
    config: {
      whisper: {
        model: 'base',
        language: 'zh'
      },
      vocabulary: {
        path: '/tmp/base-vocabulary.json'
      }
    },
    modelDownloader: {
      async checkModel() {
        events.push('downloader:check');
        throw new Error('downloader should not be used for injected engines');
      }
    },
    runtimePaths: {
      sharedModelsDir: '/models',
      sharedDebugCapturesDir: '/captures',
      whisperBinPath: '/bin/whisper-cli',
      getBundledModelPath(modelName) {
        return `/bundled/${modelName}`;
      },
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    },
    whisperEngine
  });

  await service.applyConfig({
    whisper: {
      model: 'small',
      language: 'zh',
      prompt: 'next'
    },
    vocabulary: {
      path: '/tmp/next-vocabulary.json'
    }
  });

  assert.deepEqual(events, [
    'engine:update:/models/ggml-base.bin'
  ]);
  assert.equal(whisperEngine.modelPath, '/models/ggml-base.bin');
});

test('bootstrap app keeps startup sequencing outside the Electron entrypoint', async () => {
  const events = [];
  const root = {
    async initialize() {
      events.push('root:initialize');
    },
    async dispose() {
      events.push('root:dispose');
    }
  };

  const bootstrap = bootstrapApp({
    app: {
      getVersion() {
        return '1.0.0';
      },
      whenReady: async () => {
        events.push('app:when-ready');
      },
      dock: {
        hide() {
          events.push('app:dock-hide');
        }
      }
    },
    logger: {
      async init() {
        events.push('logger:init');
      },
      info() {},
      warn() {},
      error() {}
    },
    createRuntimeEnv() {
      events.push('runtime-env:create');
      return {
        platform: 'darwin',
        arch: 'arm64',
        isPackaged: false,
        appPath: '/app',
        resourcesPath: '/resources',
        homeDir: '/Users/tester'
      };
    },
    createRuntimePaths({ runtimeEnv }) {
      events.push(`runtime-paths:create:${runtimeEnv.platform}`);
      return {
        runtimeEnv
      };
    },
    createCompositionRoot({ runtimeEnv, runtimePaths }) {
      events.push(`composition-root:create:${runtimeEnv.platform}:${Boolean(runtimePaths.runtimeEnv)}`);
      return root;
    }
  });

  await bootstrap.start();
  await bootstrap.dispose();

  assert.deepEqual(events, [
    'runtime-env:create',
    'runtime-paths:create:darwin',
    'logger:init',
    'app:when-ready',
    'app:dock-hide',
    'composition-root:create:darwin:true',
    'root:initialize',
    'root:dispose'
  ]);
});

test('lifecycle module owns Electron event registration and shutdown cleanup', async () => {
  const events = [];
  const handlers = {};
  const bootstrap = {
    async start() {
      events.push('bootstrap:start');
    },
    async dispose() {
      events.push('bootstrap:dispose');
    }
  };

  const app = {
    requestSingleInstanceLock() {
      events.push('app:request-lock');
      return true;
    },
    on(eventName, handler) {
      handlers[eventName] = handler;
    },
    quit() {
      events.push('app:quit');
    }
  };

  registerAppLifecycle({
    app,
    createBootstrap() {
      events.push('bootstrap:create');
      return bootstrap;
    },
    logger: {
      error() {
        events.push('logger:error');
      }
    }
  });

  await handlers.ready();
  handlers['window-all-closed']({
    preventDefault() {
      events.push('window-all-closed:prevent-default');
    }
  });
  await handlers['will-quit']();

  assert.deepEqual(events, [
    'app:request-lock',
    'bootstrap:create',
    'bootstrap:start',
    'window-all-closed:prevent-default',
    'bootstrap:dispose'
  ]);
});
