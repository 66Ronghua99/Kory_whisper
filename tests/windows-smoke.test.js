const test = require('node:test');
const assert = require('node:assert/strict');

const windowsSmoke = require('../src/main/cli/windows-smoke.js');

function createShortcutServiceSpy(events) {
  const handlers = {};

  return {
    handlers,
    async start() {
      events.push('shortcut:start');
    },
    onLongPressStart(handler) {
      handlers.start = handler;
      events.push('shortcut:register:start');
    },
    onLongPressEnd(handler) {
      handlers.end = handler;
      events.push('shortcut:register:end');
    }
  };
}

function createLoggerSpy(events, options = {}) {
  return {
    info(...args) {
      events.push(`log:info:${args[0]}`);
    },
    error(...args) {
      events.push(`log:error:${args[0]}`);
      if (options.throwOnError) {
        throw new Error('logger failed');
      }
    }
  };
}

async function flushAsyncHandlers() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject
  };
}

function createWindowsSmokePreflightHarness(overrides = {}) {
  const whisperBinPath = 'C:\\repo\\bin\\whisper-cli.exe';
  const ffmpegBinary = 'C:\\ffmpeg\\bin\\ffmpeg.exe';

  return {
    runtimePaths: {
      whisperBinPath
    },
    fileExists(filePath) {
      return filePath === whisperBinPath || filePath === ffmpegBinary;
    },
    hookProbe: async () => {},
    audioRecorder: {
      resolveFfmpegBinary() {
        return ffmpegBinary;
      }
    },
    permissionGateway: {
      async check() {
        return { microphoneGranted: true };
      },
      getGuidanceSurfaces() {
        return [];
      }
    },
    ...overrides
  };
}

test('windows smoke entrypoint exposes the Windows-only smoke contract', async () => {
  assert.match(windowsSmoke.STARTUP_BANNER, /Kory Whisper Windows smoke runner/);
  assert.equal(windowsSmoke.DEFAULT_TRIGGER, 'RIGHT CONTROL');
  assert.equal(typeof windowsSmoke.createWindowsSmokeRunner, 'function');

  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'darwin'
    },
    logger: {
      log() {}
    },
    preflight: async () => 'preflight-ready',
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  assert.equal(typeof runner.preflight, 'function');
  assert.equal(typeof runner.start, 'function');
  await assert.rejects(runner.preflight(), /Windows-only/i);
});

test('windows smoke runner starts on win32, registers handlers, and delivers transcripts to the clipboard', async () => {
  const events = [];
  const shortcutService = createShortcutServiceSpy(events);

  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness(),
    logger: createLoggerSpy(events),
    shortcutService,
    recordingService: {
      async start() {
        events.push('recording:start');
      },
      async stop() {
        events.push('recording:stop');
        return '/tmp/capture.wav';
      }
    },
    transcriptionService: {
      async transcribe(audioPath) {
        events.push(`transcribe:${audioPath}`);
        return 'hello world';
      }
    },
    clipboardDelivery: {
      async deliverText(text) {
        events.push(`clipboard:${text}`);
      }
    }
  });

  await runner.start();

  assert.equal(typeof shortcutService.handlers.start, 'function');
  assert.equal(typeof shortcutService.handlers.end, 'function');

  await shortcutService.handlers.start();
  await shortcutService.handlers.end();
  await flushAsyncHandlers();

  assert.deepEqual(events, [
    'log:info:[Windows Smoke] ==================== Kory Whisper Windows smoke runner ====================',
    'log:info:[Windows Smoke] Listening for long-press RIGHT CONTROL',
    'shortcut:register:start',
    'shortcut:register:end',
    'shortcut:start',
    'log:info:[Windows Smoke] Long press started',
    'recording:start',
    'log:info:[Windows Smoke] Long press ended',
    'recording:stop',
    'transcribe:/tmp/capture.wav',
    'clipboard:hello world',
    'log:info:[Windows Smoke] Transcript:'
  ]);
});

test('windows smoke runner completes the gesture when release happens before recording start resolves', async () => {
  const events = [];
  const shortcutService = createShortcutServiceSpy(events);
  const startDeferred = createDeferred();

  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness(),
    logger: createLoggerSpy(events),
    shortcutService,
    recordingService: {
      async start() {
        events.push('recording:start');
        return startDeferred.promise;
      },
      async stop() {
        events.push('recording:stop');
        return '/tmp/capture.wav';
      }
    },
    transcriptionService: {
      async transcribe(audioPath) {
        events.push(`transcribe:${audioPath}`);
        return 'hello world';
      }
    },
    clipboardDelivery: {
      async deliverText(text) {
        events.push(`clipboard:${text}`);
      }
    }
  });

  await runner.start();

  const startPromise = shortcutService.handlers.start();
  await flushAsyncHandlers();

  await shortcutService.handlers.end();
  await flushAsyncHandlers();

  assert.deepEqual(events, [
    'log:info:[Windows Smoke] ==================== Kory Whisper Windows smoke runner ====================',
    'log:info:[Windows Smoke] Listening for long-press RIGHT CONTROL',
    'shortcut:register:start',
    'shortcut:register:end',
    'shortcut:start',
    'log:info:[Windows Smoke] Long press started',
    'recording:start',
    'log:info:[Windows Smoke] Long press ended'
  ]);

  startDeferred.resolve();
  await startPromise;
  await flushAsyncHandlers();

  assert.deepEqual(events, [
    'log:info:[Windows Smoke] ==================== Kory Whisper Windows smoke runner ====================',
    'log:info:[Windows Smoke] Listening for long-press RIGHT CONTROL',
    'shortcut:register:start',
    'shortcut:register:end',
    'shortcut:start',
    'log:info:[Windows Smoke] Long press started',
    'recording:start',
    'log:info:[Windows Smoke] Long press ended',
    'recording:stop',
    'transcribe:/tmp/capture.wav',
    'clipboard:hello world',
    'log:info:[Windows Smoke] Transcript:'
  ]);
});

test('windows smoke runner reports failures safely when logger.error and onError both throw', async () => {
  const events = [];
  const diagnostics = [];
  const shortcutService = createShortcutServiceSpy(events);
  const unhandledRejections = [];
  const consoleErrors = [];
  const originalConsoleError = console.error;

  const onUnhandledRejection = (reason) => {
    unhandledRejections.push(reason);
  };

  console.error = (...args) => {
    consoleErrors.push(args[0]);
  };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const runner = windowsSmoke.createWindowsSmokeRunner({
      runtimeEnv: {
        platform: 'win32'
      },
      ...createWindowsSmokePreflightHarness(),
      logger: createLoggerSpy(events, {
        throwOnError: true
      }),
      shortcutService,
      recordingService: {
        async start() {
          events.push('recording:start');
          throw new Error('microphone missing');
        },
        async stop() {
          events.push('recording:stop');
          throw new Error('stop should not run');
        }
      },
      transcriptionService: {
        async transcribe() {
          events.push('transcribe');
          throw new Error('transcribe should not run');
        }
      },
      clipboardDelivery: {
        async deliverText() {
          events.push('clipboard');
          throw new Error('clipboard should not run');
        }
      },
      onError() {
        diagnostics.push('called');
        throw new Error('hook failed');
      }
    });

    await runner.start();
    await shortcutService.handlers.start();
    await flushAsyncHandlers();

    assert.deepEqual(unhandledRejections, []);
    assert.equal(diagnostics.length, 1);
    assert.equal(events.includes('log:error:[Windows Smoke] Failure:'), true);
    assert.equal(consoleErrors.length >= 2, true);
  } finally {
    process.removeListener('unhandledRejection', onUnhandledRejection);
    console.error = originalConsoleError;
  }
});

test('windows smoke runner does not stop, transcribe, or copy after a failed recording start', async () => {
  const events = [];
  const diagnostics = [];
  const shortcutService = createShortcutServiceSpy(events);

  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness(),
    logger: createLoggerSpy(events),
    shortcutService,
    recordingService: {
      async start() {
        events.push('recording:start');
        throw new Error('microphone missing');
      },
      async stop() {
        events.push('recording:stop');
        throw new Error('stop should not run');
      }
    },
    transcriptionService: {
      async transcribe() {
        events.push('transcribe');
        throw new Error('transcribe should not run');
      }
    },
    clipboardDelivery: {
      async deliverText() {
        events.push('clipboard');
        throw new Error('clipboard should not run');
      }
    },
    onError(diagnostic) {
      diagnostics.push(diagnostic);
    }
  });

  await runner.start();
  await shortcutService.handlers.start();
  await shortcutService.handlers.end();
  await flushAsyncHandlers();

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].stage, 'recording:start');
  assert.equal(events.includes('recording:stop'), false);
  assert.equal(events.includes('transcribe'), false);
  assert.equal(events.includes('clipboard'), false);
});

test('windows smoke runner reports transcription and clipboard failures without continuing downstream', async () => {
  const scenarios = [
    {
      stage: 'transcription:transcribe',
      transcriptionService: {
        async transcribe(audioPath) {
          throw new Error(`transcription failed for ${audioPath}`);
        }
      },
      clipboardDelivery: {
        async deliverText() {
          throw new Error('clipboard should not run');
        }
      }
    },
    {
      stage: 'clipboard:deliver',
      transcriptionService: {
        async transcribe() {
          return 'hello world';
        }
      },
      clipboardDelivery: {
        async deliverText() {
          throw new Error('clipboard failed');
        }
      }
    }
  ];

  for (const scenario of scenarios) {
    const events = [];
    const diagnostics = [];
    const shortcutService = createShortcutServiceSpy(events);

    const runner = windowsSmoke.createWindowsSmokeRunner({
      runtimeEnv: {
        platform: 'win32'
      },
      ...createWindowsSmokePreflightHarness(),
      logger: createLoggerSpy(events),
      shortcutService,
      recordingService: {
        async start() {
          events.push('recording:start');
        },
        async stop() {
          events.push('recording:stop');
          return '/tmp/capture.wav';
        }
      },
      transcriptionService: {
        async transcribe(audioPath) {
          events.push(`transcribe:${audioPath}`);
          return scenario.transcriptionService.transcribe(audioPath);
        }
      },
      clipboardDelivery: {
        async deliverText(text) {
          events.push(`clipboard:${text}`);
          return scenario.clipboardDelivery.deliverText(text);
        }
      },
      onError(diagnostic) {
        diagnostics.push(diagnostic);
      }
    });

    await runner.start();
    await shortcutService.handlers.start();
    await shortcutService.handlers.end();
    await flushAsyncHandlers();

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].stage, scenario.stage);
    assert.equal(events.filter((event) => event === 'recording:stop').length, 1);
    assert.equal(events.filter((event) => event.startsWith('transcribe:')).length, 1);
    assert.equal(events.filter((event) => event.startsWith('clipboard:')).length, scenario.stage === 'clipboard:deliver' ? 1 : 0);
  }
});

test('windows smoke preflight rejects when the shortcut hook probe fails', async () => {
  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    runtimePaths: {
      whisperBinPath: 'C:\\repo\\bin\\whisper-cli.exe'
    },
    fileExists(filePath) {
      return filePath === 'C:\\repo\\bin\\whisper-cli.exe' || filePath === 'C:\\ffmpeg\\bin\\ffmpeg.exe';
    },
    hookProbe: async () => {
      throw new Error('uiohook init failed');
    },
    audioRecorder: {
      resolveFfmpegBinary() {
        return 'C:\\ffmpeg\\bin\\ffmpeg.exe';
      }
    },
    permissionGateway: {
      async check() {
        return { microphoneGranted: true };
      },
      getGuidanceSurfaces() {
        return [];
      }
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  await assert.rejects(runner.preflight(), /hook initialization failed/i);
});

test('windows smoke preflight fails explicitly when helper prerequisites are absent', async () => {
  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  await assert.rejects(
    runner.preflight(),
    /Windows smoke preflight requires runtimePaths, audioRecorder, permissionGateway/
  );
});

test('windows smoke preflight allows the helper to default hookProbe and fileExists when the required dependencies are present', async () => {
  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    runtimePaths: {
      whisperBinPath: process.execPath
    },
    audioRecorder: {
      resolveFfmpegBinary() {
        return process.execPath;
      }
    },
    permissionGateway: {
      async check() {
        return { microphoneGranted: true, accessibilityEnabled: true };
      },
      getGuidanceSurfaces() {
        return [];
      }
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  const result = await runner.preflight();

  assert.equal(result.ffmpegBinary, process.execPath);
  assert.equal(result.permissionState.microphoneGranted, true);
  assert.equal(result.permissionState.accessibilityEnabled, true);
});

test('windows smoke preflight rejects when repository-managed whisper-cli.exe is missing', async () => {
  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    runtimePaths: {
      whisperBinPath: 'C:\\repo\\bin\\whisper-cli.exe'
    },
    fileExists() {
      return false;
    },
    hookProbe: async () => {},
    audioRecorder: {
      resolveFfmpegBinary() {
        return 'C:\\ffmpeg\\bin\\ffmpeg.exe';
      }
    },
    permissionGateway: {
      async check() {
        return { microphoneGranted: true };
      },
      getGuidanceSurfaces() {
        return [];
      }
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  await assert.rejects(runner.preflight(), /whisper-cli\.exe/i);
});

test('windows smoke preflight rejects when ffmpeg is missing or invalid', async () => {
  const missingFfmpegRunner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness({
      fileExists(filePath) {
        return filePath === 'C:\\repo\\bin\\whisper-cli.exe';
      }
    }),
    audioRecorder: {
      resolveFfmpegBinary() {
        return null;
      }
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  const invalidFfmpegRunner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness({
      fileExists(filePath) {
        return filePath === 'C:\\repo\\bin\\whisper-cli.exe';
      }
    }),
    audioRecorder: {
      resolveFfmpegBinary() {
        return 'C:\\bad\\ffmpeg.exe';
      }
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  await assert.rejects(missingFfmpegRunner.preflight(), /ffmpeg/i);
  await assert.rejects(invalidFfmpegRunner.preflight(), /ffmpeg/i);
});

test('windows smoke preflight rejects when no DirectShow microphone device is available', async () => {
  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness(),
    audioRecorder: {
      resolveFfmpegBinary() {
        return 'C:\\ffmpeg\\bin\\ffmpeg.exe';
      },
      resolveInputDevice() {
        return null;
      }
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  await assert.rejects(runner.preflight(), /DirectShow microphone input device/i);
});

test('windows smoke preflight surfaces microphone guidance when access is blocked', async () => {
  const runner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness({
      permissionGateway: {
        async check() {
          return { microphoneGranted: false };
        },
        getGuidanceSurfaces() {
          return ['microphone'];
        },
        getMicrophoneGuidance() {
          return {
            surface: 'microphone',
            title: 'Enable microphone access',
            detail: 'Open Windows microphone privacy settings.',
            settingsUri: 'ms-settings:privacy-microphone'
          };
        }
      }
    }),
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  await assert.rejects(runner.preflight(), (error) => {
    assert.match(error.message, /microphone/i);
    assert.deepEqual(error.guidanceSurfaces, ['microphone']);
    return true;
  });
});

test('windows smoke preflight rejects when permission gateway is missing or nonconforming', async () => {
  const invalidGatewayRunner = windowsSmoke.createWindowsSmokeRunner({
    runtimeEnv: {
      platform: 'win32'
    },
    runtimePaths: {
      whisperBinPath: 'C:\\repo\\bin\\whisper-cli.exe'
    },
    fileExists(filePath) {
      return filePath === 'C:\\repo\\bin\\whisper-cli.exe' || filePath === 'C:\\ffmpeg\\bin\\ffmpeg.exe';
    },
    hookProbe: async () => {},
    audioRecorder: {
      resolveFfmpegBinary() {
        return 'C:\\ffmpeg\\bin\\ffmpeg.exe';
      }
    },
    permissionGateway: {
      check: null
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  await assert.rejects(invalidGatewayRunner.preflight(), /permissionGateway\.check is required/i);
});

test('windows smoke command renders usage text and skips startup when help is requested', async () => {
  const events = [];
  const shortcutService = createShortcutServiceSpy(events);
  const stdoutChunks = [];
  const command = windowsSmoke.createWindowsSmokeCommand({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness(),
    stdout: {
      write(chunk) {
        stdoutChunks.push(chunk);
      }
    },
    logger: createLoggerSpy(events),
    shortcutService,
    recordingService: {
      async start() {
        events.push('recording:start');
      },
      async stop() {
        events.push('recording:stop');
        return '/tmp/capture.wav';
      }
    },
    transcriptionService: {
      async transcribe() {
        events.push('transcribe');
        return 'hello world';
      }
    },
    clipboardDelivery: {
      async deliverText() {
        events.push('clipboard');
      }
    }
  });

  const result = await command.run(['--help']);

  assert.equal(result.exitCode, 0);
  assert.match(result.output, /Usage: .*smoke:windows|electron \. --smoke-windows/i);
  assert.match(stdoutChunks.join(''), /Usage: .*smoke:windows|electron \. --smoke-windows/i);
  assert.deepEqual(events, []);
});

test('windows smoke CLI reports errors to stderr when logger.error is unavailable', async () => {
  const stderrChunks = [];

  const result = await windowsSmoke.runWindowsSmokeCli([], {
    runtimeEnv: {
      platform: 'win32',
      arch: 'x64',
      isPackaged: false,
      appPath: 'C:\\repo\\Kory_whisper',
      resourcesPath: 'C:\\repo\\Kory_whisper\\dist\\resources',
      homeDir: 'C:\\Users\\tester'
    },
    stderr: {
      write(chunk) {
        stderrChunks.push(chunk);
      }
    },
    logger: {
      info() {},
      error() {
        throw new Error('logger unavailable');
      }
    },
    shortcutService: {
      start: async () => {},
      onLongPressStart() {},
      onLongPressEnd() {}
    },
    recordingService: {
      start: async () => {},
      stop: async () => '/tmp/capture.wav'
    },
    transcriptionService: {
      transcribe: async () => 'hello world'
    },
    clipboardDelivery: {
      deliverText: async () => {}
    }
  });

  assert.equal(result.exitCode, 1);
  assert.match(stderrChunks.join(''), /whisper-cli\.exe|Windows smoke preflight requires runtimePaths, audioRecorder, permissionGateway/);
});

test('windows smoke command wires the RIGHT CONTROL long-press flow through recording, transcription, transcript logging, and clipboard delivery', async () => {
  const events = [];
  const shortcutService = createShortcutServiceSpy(events);
  const command = windowsSmoke.createWindowsSmokeCommand({
    runtimeEnv: {
      platform: 'win32'
    },
    ...createWindowsSmokePreflightHarness(),
    logger: createLoggerSpy(events),
    shortcutService,
    recordingService: {
      async start() {
        events.push('recording:start');
      },
      async stop() {
        events.push('recording:stop');
        return '/tmp/capture.wav';
      }
    },
    transcriptionService: {
      async transcribe(audioPath) {
        events.push(`transcribe:${audioPath}`);
        return 'hello world';
      }
    },
    clipboardDelivery: {
      async deliverText(text) {
        events.push(`clipboard:${text}`);
      }
    }
  });

  await command.run();

  await shortcutService.handlers.start();
  await shortcutService.handlers.end();
  await flushAsyncHandlers();

  assert.deepEqual(events, [
    'log:info:[Windows Smoke] ==================== Kory Whisper Windows smoke runner ====================',
    'log:info:[Windows Smoke] Listening for long-press RIGHT CONTROL',
    'shortcut:register:start',
    'shortcut:register:end',
    'shortcut:start',
    'log:info:[Windows Smoke] Long press started',
    'recording:start',
    'log:info:[Windows Smoke] Long press ended',
    'recording:stop',
    'transcribe:/tmp/capture.wav',
    'clipboard:hello world',
    'log:info:[Windows Smoke] Transcript:'
  ]);
});
