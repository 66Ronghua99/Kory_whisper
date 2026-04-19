const test = require('node:test');
const assert = require('node:assert/strict');

const {
  prepareTranscriptionService
} = require('../src/main/services/transcription-service.js');

test('prepareTranscriptionService rejects a downloaded model that still fails size validation', async () => {
  const events = [];
  let checkCount = 0;

  const service = await prepareTranscriptionService({
    config: {
      whisper: {
        model: 'small',
        language: 'zh',
        prompt: ''
      },
      vocabulary: {
        path: '/tmp/vocabulary.json'
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
        events.push(`check:${modelName}:${checkCount}`);
        checkCount += 1;

        if (checkCount === 1) {
          return {
            exists: false,
            size: 0,
            path: `/models/${modelName}`
          };
        }

        return {
          exists: true,
          size: 20 * 1024 * 1024,
          path: `/models/${modelName}`
        };
      },
      getModelInfo(modelName) {
        events.push(`info:${modelName}`);
        return { size: '466 MB', desc: 'small model' };
      },
      async seedModelFromPath(sourcePath, modelName) {
        events.push(`seed:${modelName}:${sourcePath}`);
        return { copied: false, size: 0, path: `/models/${modelName}` };
      },
      async downloadModel(modelName, onProgress) {
        events.push(`download:${modelName}`);
        onProgress(42);
        return `/models/${modelName}`;
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
    WhisperEngine: class {
      constructor() {
        events.push('engine:create');
      }
    }
  });

  assert.equal(service, null);
  assert.deepEqual(events, [
    'check:ggml-small.bin:0',
    'info:ggml-small.bin',
    'seed:ggml-small.bin:/bundled/ggml-small.bin',
    'dialog:show',
    'progress-window:load',
    'download:ggml-small.bin',
    'progress:progress:[object Object]',
    'progress-window:close',
    'check:ggml-small.bin:1',
    'dialog:error'
  ]);
});

test('prepareTranscriptionService replays the latest queued progress after the window finishes loading', async () => {
  const sentProgress = [];
  const browserWindows = [];
  let downloaded = false;

  const service = await prepareTranscriptionService({
    config: {
      whisper: {
        model: 'small',
        language: 'zh',
        prompt: ''
      },
      vocabulary: {
        path: '/tmp/vocabulary.json'
      }
    },
    BrowserWindow: class {
      constructor() {
        this.readyHandler = null;
        this.webContents = {
          once: (event, handler) => {
            if (event === 'did-finish-load') {
              this.readyHandler = handler;
            }
          },
          send: (channel, payload) => {
            sentProgress.push({ channel, payload });
          }
        };
        browserWindows.push(this);
      }

      loadURL() {}

      close() {}
    },
    dialog: {
      async showMessageBox() {
        return { response: 0 };
      },
      showErrorBox() {}
    },
    modelDownloader: {
      async checkModel(modelName) {
        return {
          exists: downloaded,
          size: downloaded ? 500 * 1024 * 1024 : 0,
          path: `/models/${modelName}`
        };
      },
      getModelInfo() {
        return { size: '466 MB', desc: 'small model' };
      },
      async seedModelFromPath(sourcePath, modelName) {
        return { copied: false, size: 0, path: `/models/${modelName}` };
      },
      async downloadModel(modelName, onProgress) {
        onProgress({
          percent: null,
          downloadedBytes: 5 * 1024 * 1024,
          totalBytes: null
        });
        browserWindows[0].readyHandler();
        onProgress({
          percent: '10.0',
          downloadedBytes: 10 * 1024 * 1024,
          totalBytes: 100 * 1024 * 1024
        });
        downloaded = true;
        return `/models/${modelName}`;
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
    WhisperEngine: class {
      constructor() {}
    }
  });

  assert.ok(service);
  assert.deepEqual(sentProgress, [
    {
      channel: 'progress',
      payload: {
        percent: null,
        downloadedBytes: 5 * 1024 * 1024,
        totalBytes: null
      }
    },
    {
      channel: 'progress',
      payload: {
        percent: '10.0',
        downloadedBytes: 10 * 1024 * 1024,
        totalBytes: 100 * 1024 * 1024
      }
    }
  ]);
});
