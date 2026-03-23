const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

const { createCompositionRoot } = require('../src/main/app/composition-root.js');
const { bootstrapApp } = require('../src/main/app/bootstrap.js');
const { registerAppLifecycle } = require('../src/main/app/lifecycle.js');

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

  const whisperEngine = {
    modelPath: '/models/ggml-base.bin',
    vocabPath: '/tmp/vocabulary.json',
    language: 'zh',
    prompt: '',
    outputScript: 'simplified',
    enablePunctuation: true,
    localLLM: {
      stopServer() {
        events.push('whisper:stop-server');
      }
    },
    async transcribe(audioPath) {
      events.push(`transcribe:${audioPath}`);
      return 'hello world';
    },
    updateRuntimeOptions(options) {
      events.push(`transcribe:update:${options.modelPath}`);
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
      inputSimulator,
      whisperEngine
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
  assert.equal(events.includes('transcribe:update:/models/ggml-small.bin'), true);

  trayManager.emit('show-settings');
  trayManager.emit('quit');
  await root.dispose();

  assert.equal(events.includes('tray:open-settings'), true);
  assert.equal(events.includes('app:quit'), true);
  assert.equal(events.includes('shortcut:stop'), true);
  assert.equal(events.includes('whisper:stop-server'), true);
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
