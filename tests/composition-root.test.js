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

test('initialize opens permission onboarding on startup when readiness is blocked', async () => {
  const events = [];
  const shortcutManager = createShortcutManagerSpy(events);
  const trayManager = new EventEmitter();
  trayManager.init = () => {
    events.push('tray:init');
  };
  trayManager.setPermissionReadiness = (readiness) => {
    events.push(`tray:set-readiness:${readiness.isReady}`);
  };
  trayManager.showPermissionBlocked = (readiness) => {
    events.push(`tray:blocked:${readiness.isReady}`);
  };
  trayManager.showPermissionOnboarding = () => {
    events.push('tray:show-onboarding');
  };

  const blockedFacts = {
    microphoneGranted: false,
    accessibilityEnabled: false,
    inputMonitoringStatus: 'missing',
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: {
        granted: false
      },
      accessibility: {
        granted: false
      },
      inputMonitoring: {
        status: 'missing'
      }
    }
  };

  const root = createCompositionRoot({
    app: { quit() {} },
    ipcMain: {
      handle() {}
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
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager,
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          events.push('permissions:check');
          return blockedFacts;
        },
        async ensure() {
          throw new Error('startup should read shared readiness directly');
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: {
        modelPath: '/models/ggml-base.bin'
      },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
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

  assert.deepEqual(events, [
    'tray:init',
    'permissions:check',
    'tray:set-readiness:false',
    'tray:blocked:false',
    'tray:show-onboarding',
    'shortcut:start'
  ]);
});

test('initialize keeps blocked tray state without auto-opening onboarding when first-run flag is false', async () => {
  const events = [];
  const shortcutManager = createShortcutManagerSpy(events);
  const trayManager = new EventEmitter();
  trayManager.init = () => {
    events.push('tray:init');
  };
  trayManager.setPermissionReadiness = (readiness) => {
    events.push(`tray:set-readiness:${readiness.isReady}`);
  };
  trayManager.showPermissionBlocked = (readiness) => {
    events.push(`tray:blocked:${readiness.isReady}`);
  };
  trayManager.showPermissionOnboarding = () => {
    events.push('tray:show-onboarding');
  };

  const blockedFacts = {
    isReady: false,
    firstRunNeedsOnboarding: false,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: { status: 'granted', settingsTarget: 'microphone' },
      accessibility: { status: 'missing', settingsTarget: 'accessibility' },
      inputMonitoring: { status: 'missing', settingsTarget: 'input-monitoring' }
    }
  };

  const root = createCompositionRoot({
    app: { quit() {} },
    ipcMain: { handle() {} },
    configManager: {
      get() {
        return {
          shortcut: { key: 'RIGHT COMMAND', longPressDuration: 500 },
          input: { appendSpace: true },
          audioCues: { enabled: true },
          whisper: { model: 'base', language: 'zh', prompt: '' },
          vocabulary: { path: '/tmp/vocabulary.json' }
        };
      },
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager,
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          events.push('permissions:check');
          return blockedFacts;
        },
        async ensure() {
          throw new Error('startup should read shared readiness directly');
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: { modelPath: '/models/ggml-base.bin' },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
    logger: {
      info() {},
      warn() {},
      error() {}
    },
    runtimeEnv: { platform: 'darwin' },
    runtimePaths: {
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    }
  });

  await root.initialize();

  assert.deepEqual(events, [
    'tray:init',
    'permissions:check',
    'tray:set-readiness:false',
    'tray:blocked:false',
    'shortcut:start'
  ]);
});

test('initialize keeps unknown input monitoring unresolved until a real shortcut validation happens', async () => {
  const events = [];
  const shortcutManager = createShortcutManagerSpy(events);
  const trayManager = new EventEmitter();
  trayManager.init = () => {
    events.push('tray:init');
  };
  trayManager.setPermissionReadiness = (readiness) => {
    events.push(`tray:set-readiness:${readiness.isReady}:${readiness.surfaces.inputMonitoring.status}`);
  };
  trayManager.showPermissionBlocked = (readiness) => {
    events.push(`tray:blocked:${readiness.surfaces.inputMonitoring.status}`);
  };
  trayManager.showPermissionOnboarding = () => {
    events.push('tray:show-onboarding');
  };

  const blockedFacts = {
    microphoneGranted: true,
    accessibilityEnabled: true,
    inputMonitoringStatus: 'unknown',
    firstRunNeedsOnboarding: true,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: { granted: true },
      accessibility: { granted: true },
      inputMonitoring: { status: 'unknown', settingsTarget: 'input-monitoring' }
    }
  };

  const root = createCompositionRoot({
    app: { quit() {} },
    ipcMain: { handle() {} },
    configManager: {
      get() {
        return {
          shortcut: { key: 'RIGHT COMMAND', longPressDuration: 500 },
          input: { appendSpace: true },
          audioCues: { enabled: true },
          whisper: { model: 'base', language: 'zh', prompt: '' },
          vocabulary: { path: '/tmp/vocabulary.json' }
        };
      },
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager,
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          events.push('permissions:check');
          return blockedFacts;
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: { modelPath: '/models/ggml-base.bin' },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
    logger: {
      info() {},
      warn() {},
      error() {}
    },
    runtimeEnv: { platform: 'darwin' },
    runtimePaths: {
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    }
  });

  await root.initialize();

  assert.deepEqual(events, [
    'tray:init',
    'permissions:check',
    'tray:set-readiness:false:unknown',
    'tray:blocked:unknown',
    'tray:show-onboarding',
    'shortcut:start'
  ]);
});

test('initialize fails closed into blocked tray state when readiness lookup throws', async () => {
  const events = [];
  const shortcutManager = createShortcutManagerSpy(events);
  const trayManager = new EventEmitter();
  trayManager.init = () => {
    events.push('tray:init');
  };
  trayManager.setPermissionReadiness = (readiness) => {
    events.push(`tray:set-readiness:${readiness.isReady}:${readiness.surfaces.microphone.status}`);
  };
  trayManager.showPermissionBlocked = (readiness) => {
    events.push(`tray:blocked:${readiness.surfaces.accessibility.status}`);
  };
  trayManager.showPermissionOnboarding = () => {
    events.push('tray:show-onboarding');
  };

  const root = createCompositionRoot({
    app: { quit() {} },
    ipcMain: { handle() {} },
    configManager: {
      get() {
        return {
          shortcut: { key: 'RIGHT COMMAND', longPressDuration: 500 },
          input: { appendSpace: true },
          audioCues: { enabled: true },
          whisper: { model: 'base', language: 'zh', prompt: '' },
          vocabulary: { path: '/tmp/vocabulary.json' }
        };
      },
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager,
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          throw new Error('readiness-check-failed');
        },
        async ensure() {
          throw new Error('startup should read shared readiness directly');
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: { modelPath: '/models/ggml-base.bin' },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
    logger: {
      info() {},
      warn() {},
      error() {}
    },
    runtimeEnv: { platform: 'darwin' },
    runtimePaths: {
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    }
  });

  await root.initialize();

  assert.deepEqual(events, [
    'tray:init',
    'tray:set-readiness:false:unknown',
    'tray:blocked:unknown',
    'shortcut:start'
  ]);
});

test('initialize pushes permission readiness into tray state before shortcut startup', async () => {
  const events = [];
  const shortcutManager = createShortcutManagerSpy(events);
  const trayManager = new EventEmitter();
  trayManager.init = () => {
    events.push('tray:init');
  };
  trayManager.setPermissionReadiness = (readiness) => {
    events.push(`tray:set-readiness:${readiness.isReady}`);
  };
  trayManager.showPermissionBlocked = () => {
    events.push('tray:blocked');
  };
  const readyFacts = {
    microphoneGranted: true,
    accessibilityEnabled: true,
    inputMonitoringStatus: 'granted',
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: {
        granted: true
      },
      accessibility: {
        granted: true
      },
      inputMonitoring: {
        status: 'granted'
      }
    }
  };

  const root = createCompositionRoot({
    app: { quit() {} },
    ipcMain: {
      handle() {}
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
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager,
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          events.push('permissions:check');
          return readyFacts;
        },
        async ensure() {
          throw new Error('startup should read shared readiness directly');
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: {
        modelPath: '/models/ggml-base.bin'
      },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
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

  assert.ok(events.indexOf('tray:set-readiness:true') !== -1);
  assert.ok(events.indexOf('tray:set-readiness:true') < events.indexOf('shortcut:start'));
  assert.equal(events.includes('tray:blocked'), false);
});

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
  trayManager.setPermissionReadiness = () => {};
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
  trayManager.showPermissionBlocked = () => {};
  trayManager.openPermissionOnboarding = () => {
    events.push('tray:open-onboarding');
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
        accessibilityEnabled: true,
        inputMonitoringStatus: 'granted',
        surfaces: {
          microphone: { granted: true },
          accessibility: { granted: true },
          inputMonitoring: { status: 'granted' }
        }
      };
    },
    async ensure() {
      throw new Error('startup should read shared readiness directly');
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
    'permissions:check',
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

test('composition root rebuilds transcription service when ASR mode changes', async () => {
  const events = [];
  const handlers = {};
  let currentConfig = {
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
    asr: {
      mode: 'cloud',
      cloud: {
        provider: 'aliyun-paraformer',
        apiKey: 'sk-saved-key',
        model: 'paraformer-realtime-v2'
      },
      local: {
        model: 'medium'
      }
    },
    whisper: {
      model: 'medium',
      language: 'zh',
      prompt: ''
    },
    vocabulary: {
      path: '/tmp/vocabulary.json'
    }
  };
  const preparedServices = [];
  const trayManager = new EventEmitter();
  Object.assign(trayManager, {
    init() {},
    setPermissionReadiness() {},
    showPermissionBlocked() {},
    openPermissionOnboarding() {},
    showProcessingState() {},
    showSuccessState() {},
    showErrorState() {},
    setRecordingState() {}
  });

  const root = createCompositionRoot({
    app: {
      quit() {}
    },
    ipcMain: {
      handle(channel, handler) {
        handlers[channel] = handler;
      }
    },
    configManager: {
      get() {
        return currentConfig;
      },
      async save(config) {
        currentConfig = config;
        events.push(`config:save:${config.asr.mode}`);
      },
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager: createShortcutManagerSpy(events),
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/capture.wav';
        }
      },
      permissionGateway: {
        async check() {
          return {
            microphoneGranted: true,
            accessibilityEnabled: true,
            inputMonitoringStatus: 'granted',
            surfaces: {
              microphone: { granted: true },
              accessibility: { granted: true },
              inputMonitoring: { status: 'granted' }
            }
          };
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        updateOptions() {},
        async typeText() {}
      }
    },
    prepareTranscriptionService: async ({ config }) => {
      const service = {
        mode: config.asr?.mode,
        async applyConfig(nextConfig) {
          events.push(`transcription:apply:${nextConfig.asr?.mode}`);
        },
        async transcribe() {
          events.push(`transcription:transcribe:${config.asr?.mode}`);
          return 'text';
        },
        async dispose() {
          events.push(`transcription:dispose:${config.asr?.mode}`);
        }
      };
      preparedServices.push(service);
      events.push(`transcription:prepare:${config.asr?.mode}`);
      return service;
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
  assert.equal(root.services.transcription.mode, 'cloud');

  await handlers['save-config'](null, {
    asr: {
      mode: 'local'
    }
  });

  assert.equal(root.services.transcription.mode, 'local');
  assert.equal(root.services.dictation.transcriptionService.mode, 'local');
  assert.equal(preparedServices.length, 2);
  assert.deepEqual(events.filter((event) => event.startsWith('transcription:')), [
    'transcription:prepare:cloud',
    'transcription:prepare:local',
    'transcription:dispose:cloud'
  ]);
});

test('composition root requires injected runtime facts instead of falling back to process.platform', () => {
  assert.throws(
    () => createCompositionRoot({
      runtimePaths: {}
    }),
    /runtimeEnv\.platform/
  );
});

test('composition root sanitizes renderer config reads and preserves inert whisper state on partial config saves', async () => {
  const handlers = {};
  let savedConfig = null;
  const currentConfig = {
    shortcut: {
      key: 'RIGHT COMMAND',
      longPressDuration: 500
    },
    whisper: {
      model: 'base',
      language: 'zh',
      outputScript: 'traditional',
      enablePunctuation: true,
      llm: {
        enabled: true,
        provider: 'remote',
        remote: {
          model: 'legacy-model',
          apiKey: 'legacy-key'
        }
      }
    },
    vocabulary: {
      enabled: true,
      path: '/tmp/vocabulary.json'
    },
    postProcessing: {
      enabled: false
    },
    asr: {
      mode: 'cloud',
      cloud: {
        provider: 'aliyun-paraformer',
        model: 'paraformer-realtime-v2',
        apiKey: 'sk-current-key',
        timeoutMs: 30000
      },
      local: {
        model: 'base'
      }
    },
    input: {
      appendSpace: true
    },
    audioCues: {
      enabled: true
    }
  };

  const root = createCompositionRoot({
    app: { quit() {} },
    ipcMain: {
      handle(channel, handler) {
        handlers[channel] = handler;
      }
    },
    configManager: {
      get() {
        return currentConfig;
      },
      async save(config) {
        savedConfig = config;
      },
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager: {
        on() {},
        async start() {},
        stop() {}
      },
      trayManager: Object.assign(new EventEmitter(), {
        init() {},
        setPermissionReadiness() {},
        showPermissionBlocked() {},
        dispose() {}
      }),
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          return {
            microphoneGranted: true,
            accessibilityEnabled: true,
            inputMonitoringStatus: 'granted',
            surfaces: {
              microphone: { granted: true },
              accessibility: { granted: true },
              inputMonitoring: { status: 'granted' }
            }
          };
        },
        async ensure() {
          return {
            microphoneGranted: true,
            accessibilityEnabled: true,
            inputMonitoringStatus: 'granted',
            surfaces: {
              microphone: { granted: true },
              accessibility: { granted: true },
              inputMonitoring: { status: 'granted' }
            }
          };
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      },
      async asrConnectionTester(config) {
        if (config.asr?.cloud?.apiKey === 'sk-bad-key') {
          throw new Error('provider rejected sk-bad-key');
        }
        return { provider: config.asr?.cloud?.provider };
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: {
        modelPath: '/models/ggml-base.bin'
      },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
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

  const rendererConfig = await handlers['get-config']();

  assert.equal(rendererConfig.whisper.model, 'base');
  assert.equal(rendererConfig.postProcessing.enabled, false);
  assert.equal('llm' in rendererConfig.whisper, false);
  assert.equal(rendererConfig.asr.cloud.apiKey, '');
  assert.equal(typeof handlers['test-asr-connection'], 'function');

  await handlers['save-config'](null, {
    asr: {
      mode: 'cloud',
      cloud: {
        apiKey: 'sk-new-key'
      }
    },
    whisper: {
      model: 'small',
      language: 'en',
      outputScript: 'original',
      enablePunctuation: false
    },
    postProcessing: {
      enabled: true
    }
  });

  assert.equal(savedConfig.whisper.model, 'small');
  assert.equal(savedConfig.whisper.outputScript, 'original');
  assert.equal(savedConfig.postProcessing.enabled, true);
  assert.equal(savedConfig.asr.cloud.apiKey, 'sk-new-key');
  assert.deepEqual(savedConfig.whisper.llm, currentConfig.whisper.llm);

  assert.deepEqual(await handlers['test-asr-connection'](null, {
    asr: {
      mode: 'cloud',
      cloud: {
        apiKey: 'sk-good-key'
      }
    }
  }), { ok: true, provider: 'aliyun-paraformer' });

  const failedConnection = await handlers['test-asr-connection'](null, {
    asr: {
      mode: 'cloud',
      cloud: {
        apiKey: 'sk-bad-key'
      }
    }
  });
  assert.equal(failedConnection.ok, false);
  assert.match(failedConnection.message, /provider rejected/);
  assert.doesNotMatch(failedConnection.message, /sk-bad-key/);
});

test('composition root routes shared permission readiness through tray events and ipc handlers', async () => {
  const events = [];
  const handlers = {};

  const trayManager = Object.assign(new EventEmitter(), {
    init() {
      events.push('tray:init');
    },
    setPermissionReadiness(readiness) {
      events.push(`tray:set-readiness:${readiness.isReady}`);
    },
    showPermissionBlocked() {},
    openSettings() {
      events.push('tray:open-settings');
    },
    openPermissionOnboarding() {
      events.push('tray:open-onboarding');
    },
    showPermissionOnboarding() {
      events.push('tray:open-onboarding');
    }
  });

  const permissionReadiness = {
    isReady: false,
    firstRunNeedsOnboarding: true,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: {
        status: 'missing',
        reason: 'required-for-recording',
        cta: 'request-or-open-settings',
        settingsTarget: 'microphone'
      },
      accessibility: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'accessibility'
      },
      inputMonitoring: {
        status: 'missing',
        reason: 'required-for-global-hotkey',
        cta: 'open-settings-and-recheck',
        settingsTarget: 'input-monitoring'
      }
    }
  };

  const permissionGateway = {
    async check() {
      events.push('permissions:check');
      return permissionReadiness;
    },
    async ensure() {
      throw new Error('startup should read shared readiness directly');
    },
    async recheckReadiness() {
      events.push('permissions:recheck');
      return permissionReadiness;
    },
    openSettings(surface) {
      events.push(`permissions:open:${surface}`);
    }
  };

  const root = createCompositionRoot({
    app: { quit() {} },
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
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager: {
        on() {},
        async start() {},
        stop() {}
      },
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway,
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: {
        modelPath: '/models/ggml-base.bin'
      },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
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

  assert.equal(typeof handlers['get-permission-readiness'], 'function');
  assert.equal(typeof handlers['recheck-permission-readiness'], 'function');
  assert.equal(typeof handlers['open-permission-settings'], 'function');
  assert.equal(typeof handlers['open-permission-onboarding'], 'function');

  const readiness = await handlers['get-permission-readiness']();
  assert.equal(readiness.isReady, false);
  assert.equal(readiness.surfaces.microphone.status, 'missing');

  const rechecked = await handlers['recheck-permission-readiness']();
  assert.equal(rechecked.isReady, false);

  await handlers['open-permission-settings'](null, 'input-monitoring');
  await handlers['open-permission-onboarding']();

  trayManager.emit('recheck-permission-readiness');
  trayManager.emit('open-permission-settings', 'microphone');
  trayManager.emit('open-permission-onboarding');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(events, [
    'tray:init',
    'permissions:check',
    'tray:set-readiness:false',
    'tray:open-onboarding',
    'permissions:check',
    'permissions:recheck',
    'tray:set-readiness:false',
    'permissions:open:input-monitoring',
    'tray:open-onboarding',
    'permissions:recheck',
    'permissions:open:microphone',
    'tray:open-onboarding',
    'tray:set-readiness:false'
  ]);
});

test('composition root tray and ipc readiness paths fail closed when recheck throws', async () => {
  const events = [];
  const handlers = {};

  const trayManager = Object.assign(new EventEmitter(), {
    init() {
      events.push('tray:init');
    },
    setPermissionReadiness(readiness) {
      events.push(`tray:set-readiness:${readiness.isReady}:${readiness.surfaces.microphone.status}`);
    },
    showPermissionBlocked() {},
    openSettings() {},
    showPermissionOnboarding() {}
  });

  const root = createCompositionRoot({
    app: { quit() {} },
    ipcMain: {
      handle(channel, handler) {
        handlers[channel] = handler;
      }
    },
    configManager: {
      get() {
        return {
          shortcut: { key: 'RIGHT COMMAND', longPressDuration: 500 },
          input: { appendSpace: true },
          audioCues: { enabled: true },
          whisper: { model: 'base', language: 'zh', prompt: '' },
          vocabulary: { path: '/tmp/vocabulary.json' }
        };
      },
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager: {
        on() {},
        async start() {},
        stop() {}
      },
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          return {
            microphoneGranted: true,
            accessibilityEnabled: true,
            inputMonitoringStatus: 'granted',
            surfaces: {
              microphone: { granted: true },
              accessibility: { granted: true },
              inputMonitoring: { status: 'granted' }
            }
          };
        },
        async ensure() {
          throw new Error('startup should read shared readiness directly');
        },
        async recheckReadiness() {
          throw new Error('boom');
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: { modelPath: '/models/ggml-base.bin' },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
    logger: {
      info() {},
      warn() {},
      error(message) {
        events.push(`log:error:${message}`);
      }
    },
    runtimeEnv: { platform: 'darwin' },
    runtimePaths: {
      getSharedModelPath(modelName) {
        return `/models/${modelName}`;
      }
    }
  });

  await root.initialize();

  const checked = await handlers['get-permission-readiness']();
  assert.equal(checked.isReady, true);

  const rechecked = await handlers['recheck-permission-readiness']();
  assert.equal(rechecked.isReady, false);
  assert.equal(rechecked.surfaces.microphone.status, 'unknown');

  trayManager.emit('recheck-permission-readiness');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(events, [
    'tray:init',
    'tray:set-readiness:true:granted',
    'log:error:[Main] Failed to load permission readiness:',
    'tray:set-readiness:false:unknown',
    'log:error:[Main] Failed to load permission readiness:',
    'tray:set-readiness:false:unknown'
  ]);
});

test('composition root uses the runtime tray manager directly for permission sync and onboarding', async () => {
  const events = [];
  const runtimeTrayManager = {
    init() {},
    on() {},
    openSettings() {},
    dispose() {}
  };

  const root = createCompositionRoot({
    app: { quit() {} },
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
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager: {
        on() {},
        async start() {},
        stop() {}
      },
      trayManager: runtimeTrayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          return {
            isReady: false,
            surfaces: {
              microphone: { status: 'missing', settingsTarget: 'microphone' },
              accessibility: { status: 'granted', settingsTarget: 'accessibility' },
              inputMonitoring: { status: 'missing', settingsTarget: 'input-monitoring' }
            }
          };
        },
        async ensure() {
          return {
            isReady: false,
            surfaces: {
              microphone: { status: 'missing', settingsTarget: 'microphone' },
              accessibility: { status: 'granted', settingsTarget: 'accessibility' },
              inputMonitoring: { status: 'missing', settingsTarget: 'input-monitoring' }
            }
          };
        },
        async recheckReadiness() {
          return {
            isReady: false,
            surfaces: {
              microphone: { status: 'missing', settingsTarget: 'microphone' },
              accessibility: { status: 'granted', settingsTarget: 'accessibility' },
              inputMonitoring: { status: 'missing', settingsTarget: 'input-monitoring' }
            }
          };
        },
        openSettings(surface) {
          events.push(`permissions:open:${surface}`);
        }
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: {
        modelPath: '/models/ggml-base.bin'
      },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
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

  await root.buildServices(root.configManager.get());
  root.services.tray = {
    trayManager: {
      showPermissionOnboarding() {
        events.push('tray-manager:open-onboarding');
      }
    },
    setPermissionReadiness(readiness) {
      events.push(`tray-service:set:${readiness.isReady}`);
    },
    openPermissionOnboarding() {
      throw new Error('composition root routed onboarding through the tray service wrapper');
    }
  };

  root.syncTrayPermissionReadiness({ isReady: false });
  root.openPermissionOnboarding();

  assert.deepEqual(events, [
    'tray-service:set:false',
    'tray-manager:open-onboarding'
  ]);
});

test('composition root opens onboarding directly from the runtime tray manager for ipc and tray events', async () => {
  const events = [];
  const handlers = {};

  const trayManager = new EventEmitter();
  trayManager.init = () => {
    events.push('tray:init');
  };
  trayManager.setPermissionReadiness = () => {};
  trayManager.showPermissionBlocked = () => {};
  trayManager.openSettings = () => {};
  trayManager.showPermissionOnboarding = () => {
    events.push('tray-manager:show-onboarding');
  };
  trayManager.openPermissionOnboarding = () => {
    events.push('tray-manager:emit-onboarding');
    trayManager.emit('open-permission-onboarding');
  };

  const root = createCompositionRoot({
    app: { quit() {} },
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
      async save() {},
      getVocabPath() {
        return '/tmp/vocabulary.json';
      }
    },
    collaborators: {
      shortcutManager: {
        on() {},
        async start() {},
        stop() {}
      },
      trayManager,
      audioRecorder: {
        async start() {},
        async stop() {
          return '/tmp/sample.wav';
        }
      },
      permissionGateway: {
        async check() {
          return {
            isReady: false,
            surfaces: {
              microphone: { status: 'missing', settingsTarget: 'microphone' },
              accessibility: { status: 'granted', settingsTarget: 'accessibility' },
              inputMonitoring: { status: 'missing', settingsTarget: 'input-monitoring' }
            }
          };
        },
        async ensure() {
          return {
            isReady: false,
            surfaces: {
              microphone: { status: 'missing', settingsTarget: 'microphone' },
              accessibility: { status: 'granted', settingsTarget: 'accessibility' },
              inputMonitoring: { status: 'missing', settingsTarget: 'input-monitoring' }
            }
          };
        },
        async recheckReadiness() {
          return {
            isReady: false,
            surfaces: {
              microphone: { status: 'missing', settingsTarget: 'microphone' },
              accessibility: { status: 'granted', settingsTarget: 'accessibility' },
              inputMonitoring: { status: 'missing', settingsTarget: 'input-monitoring' }
            }
          };
        },
        openSettings() {}
      },
      audioCuePlayer: {
        async playRecordingStart() {},
        async playOutputReady() {},
        updateOptions() {}
      },
      inputSimulator: {
        async typeText() {}
      }
    },
    prepareTranscriptionService: async () => ({
      whisperEngine: {
        modelPath: '/models/ggml-base.bin'
      },
      async applyConfig() {},
      async transcribe() {
        return 'text';
      },
      async dispose() {}
    }),
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
  root.services.tray.openPermissionOnboarding = () => {
    throw new Error('composition root routed onboarding through the tray service wrapper');
  };

  await handlers['open-permission-onboarding']();
  trayManager.openPermissionOnboarding();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(events, [
    'tray:init',
    'tray-manager:show-onboarding',
    'tray-manager:show-onboarding',
    'tray-manager:emit-onboarding',
    'tray-manager:show-onboarding'
  ]);
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

test('prepareTranscriptionService creates Aliyun cloud engine without local model readiness', async () => {
  const events = [];

  class FakeAliyunEngine {
    constructor(options) {
      this.options = options;
      events.push(`cloud:create:${options.apiKey}:${options.model}`);
    }

    async transcribe(audioPath) {
      events.push(`cloud:transcribe:${audioPath}`);
      return 'raw cloud text';
    }
  }

  const service = await prepareTranscriptionService({
    config: {
      asr: {
        mode: 'cloud',
        cloud: {
          provider: 'aliyun-paraformer',
          model: 'paraformer-realtime-v2',
          apiKey: 'sk-test-key',
          timeoutMs: 42000
        }
      },
      whisper: {
        language: 'zh',
        outputScript: 'simplified'
      },
      vocabulary: {
        enabled: false,
        path: '/tmp/vocabulary.json'
      },
      postProcessing: {
        enabled: true
      }
    },
    modelDownloader: {
      async checkModel() {
        throw new Error('local model readiness should not run for cloud ASR');
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
    AliyunParaformerEngine: FakeAliyunEngine,
    loadVocabularyData: async () => {
      events.push('vocabulary:load');
      return { words: [], replacements: {} };
    },
    applyPostProcessing: async (text) => {
      events.push(`postprocess:${text}`);
      return 'final cloud text';
    }
  });

  assert.ok(service instanceof TranscriptionService);
  const result = await service.transcribe('/tmp/cloud.wav');

  assert.equal(result, 'final cloud text');
  assert.deepEqual(events, [
    'cloud:create:sk-test-key:paraformer-realtime-v2',
    'cloud:transcribe:/tmp/cloud.wav',
    'postprocess:raw cloud text'
  ]);
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
            const renderedProgress = progress && typeof progress === 'object'
              ? progress.percent
              : progress;
            events.push(`progress:${channel}:${renderedProgress}`);
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
    'check:ggml-small.bin',
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

test('composition root exposes platform ui contract through get-config payload', () => {
  const contract = {
    permission: {
      surfaces: [
        {
          key: 'microphone',
          onboardingLabel: '麦克风'
        }
      ],
      surfaceOrder: ['microphone']
    }
  };

  const root = createCompositionRoot({
    runtimeEnv: {
      platform: 'darwin'
    },
    platformApi: {
      profile: {
        uiContract: contract
      }
    },
    configManager: {
      get() {
        return {
          shortcut: { key: 'RIGHT COMMAND', longPressDuration: 500 },
          input: { appendSpace: true },
          audioCues: { enabled: true },
          whisper: { model: 'base', language: 'zh', prompt: '' },
          vocabulary: { path: '/tmp/vocabulary.json' }
        };
      },
      load: async () => {},
      sanitizeForRenderer(config) {
        return config;
      },
      save: async () => {}
    }
  });

  const contractFromRoot = root.getPlatformPermissionContract();

  assert.deepEqual(contractFromRoot, contract);
});

test('composition root exposes the full platform ui contract to renderer consumers', () => {
  const handlers = {};
  const contract = {
    permission: {
      surfaces: [
        {
          key: 'microphone',
          onboardingLabel: '楹﹀厠椋?'
        }
      ],
      surfaceOrder: ['microphone']
    },
    shortcut: {
      defaultKey: 'RIGHT CONTROL',
      options: [
        { key: 'RIGHT CONTROL', label: 'Right Control' }
      ]
    },
    audioCues: {
      supported: false,
      supportedSoundNames: []
    }
  };

  const root = createCompositionRoot({
    runtimeEnv: {
      platform: 'win32'
    },
    platformApi: {
      profile: {
        uiContract: contract
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
          shortcut: { key: 'RIGHT CONTROL', longPressDuration: 500 },
          input: { appendSpace: true },
          audioCues: { enabled: false },
          whisper: { model: 'base', language: 'zh', prompt: '' },
          vocabulary: { path: '/tmp/vocabulary.json' }
        };
      },
      load: async () => {},
      sanitizeForRenderer(config) {
        return config;
      },
      save: async () => {}
    }
  });

  root.registerIpcHandlers();

  assert.deepEqual(handlers['get-config'](), {
    shortcut: { key: 'RIGHT CONTROL', longPressDuration: 500 },
    input: { appendSpace: true },
    audioCues: { enabled: false },
    whisper: { model: 'base', language: 'zh', prompt: '' },
    vocabulary: { path: '/tmp/vocabulary.json' },
    platformUiContract: contract,
    platformContract: contract
  });
});

test('composition root passes the full platform ui contract into tray readiness sync', () => {
  let seenContract = null;
  const contract = {
    permission: {
      surfaces: [],
      surfaceOrder: []
    },
    shortcut: {
      defaultKey: 'RIGHT CONTROL',
      options: []
    },
    audioCues: {
      supported: false,
      supportedSoundNames: []
    }
  };

  const root = createCompositionRoot({
    runtimeEnv: {
      platform: 'win32'
    },
    platformApi: {
      profile: {
        uiContract: contract
      }
    },
    configManager: {
      get() {
        return {
          shortcut: { key: 'RIGHT CONTROL', longPressDuration: 500 },
          input: { appendSpace: true },
          audioCues: { enabled: false },
          whisper: { model: 'base', language: 'zh', prompt: '' },
          vocabulary: { path: '/tmp/vocabulary.json' }
        };
      },
      load: async () => {},
      sanitizeForRenderer(config) {
        return config;
      },
      save: async () => {}
    }
  });

  root.services.tray = {
    setPermissionReadiness(readiness, platformUiContract) {
      seenContract = platformUiContract;
    }
  };

  root.syncTrayPermissionReadiness({ isReady: false });

  assert.deepEqual(seenContract, contract);
});

test('composition root uses the platform ui contract shortcut default when config omits a shortcut key', () => {
  const root = createCompositionRoot({
    runtimeEnv: {
      platform: 'win32'
    },
    logger: {
      info() {},
      warn() {},
      error() {}
    },
    platformApi: {
      profile: {
        uiContract: {
          shortcut: {
            defaultKey: 'RIGHT CONTROL',
            options: [
              { key: 'RIGHT CONTROL', label: 'Right Control' }
            ]
          }
        }
      },
      getAudioRecorder() {
        return {};
      },
      getPermissionGateway() {
        return {};
      },
      getAudioCuePlayer() {
        return {};
      },
      getInputSimulator() {
        return {};
      }
    }
  });

  const shortcutManager = root.createShortcutManager({
    shortcut: {
      longPressDuration: 700
    }
  });

  assert.equal(shortcutManager.key, 'RIGHT CONTROL');
  assert.equal(shortcutManager.longPressDuration, 700);
});
