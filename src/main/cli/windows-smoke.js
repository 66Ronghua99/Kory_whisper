const {
  createWindowsSmokePreflight
} = require('../runtime/windows-smoke-preflight.js');
const { createRuntimeEnv } = require('../runtime/runtime-env.js');
const { createRuntimePaths } = require('../runtime/runtime-paths.js');

const STARTUP_BANNER = '[Windows Smoke] ==================== Kory Whisper Windows smoke runner ====================';
const DEFAULT_TRIGGER = 'RIGHT CONTROL';
const WINDOWS_SMOKE_USAGE = [
  'Usage: npm run smoke:windows -- [--help]',
  '   or: electron . --smoke-windows [--help]',
  '',
  'Starts the dedicated Windows smoke runner with RIGHT CONTROL as the trigger.',
  'The command fails closed on non-Windows hosts and missing prerequisites.'
].join('\n');

function getLogger(logger = console) {
  if (logger && typeof logger.info === 'function') {
    return logger;
  }

  if (logger && typeof logger.log === 'function') {
    return {
      info: (...args) => logger.log(...args),
      warn: typeof logger.warn === 'function' ? (...args) => logger.warn(...args) : (...args) => logger.log(...args),
      error: typeof logger.error === 'function' ? (...args) => logger.error(...args) : (...args) => logger.log(...args)
    };
  }

  return console;
}

function assertWindowsHost(runtimeEnv = {}) {
  if (runtimeEnv.platform !== 'win32') {
    throw new Error('Windows smoke runner is Windows-only');
  }
}

function assertSmokeDependency(name, dependency, methodNames) {
  if (!dependency) {
    throw new Error(`Missing Windows smoke prerequisite: ${name}`);
  }

  for (const methodName of methodNames) {
    if (typeof dependency[methodName] !== 'function') {
      throw new Error(`Missing Windows smoke prerequisite: ${name}.${methodName}`);
    }
  }
}

function validateSmokeDependencies(dependencies = {}) {
  assertSmokeDependency('shortcutService', dependencies.shortcutService, ['start', 'onLongPressStart', 'onLongPressEnd']);
  assertSmokeDependency('recordingService', dependencies.recordingService, ['start', 'stop']);
  assertSmokeDependency('transcriptionService', dependencies.transcriptionService, ['transcribe']);
  assertSmokeDependency('clipboardDelivery', dependencies.clipboardDelivery, ['deliverText']);
}

function assertPreflightDependencies(dependencies = {}) {
  const required = ['runtimePaths', 'audioRecorder', 'permissionGateway'];
  const missing = required.filter((name) => dependencies[name] == null);

  if (missing.length > 0) {
    throw new Error(
      `Windows smoke preflight requires ${required.join(', ')}`
    );
  }
}

function renderWindowsSmokeUsage() {
  return WINDOWS_SMOKE_USAGE;
}

function createClipboardDelivery(options = {}) {
  if (options.clipboardDelivery) {
    return options.clipboardDelivery;
  }

  const { deliverTextToClipboard } = require('../platform/clipboard-output.js');
  const clipboard = options.clipboard || null;
  return {
    deliverText(text) {
      return deliverTextToClipboard(text, { clipboard });
    }
  };
}

function loadWindowsSmokeRuntimeFactories() {
  const { createPlatformApi } = require('../platform');
  const ShortcutService = require('../services/shortcut-service.js');
  const RecordingService = require('../services/recording-service.js');
  const { prepareTranscriptionService } = require('../services/transcription-service.js');
  const ShortcutManager = require('../shortcut-manager.js');

  return {
    createPlatformApi,
    ShortcutService,
    RecordingService,
    prepareTranscriptionService,
    ShortcutManager
  };
}

async function createWindowsSmokeCommandRunner(options = {}) {
  const runtimeEnv = options.runtimeEnv || createRuntimeEnv(options);
  const runtimePaths = options.runtimePaths || createRuntimePaths({ runtimeEnv });
  const {
    createPlatformApi,
    ShortcutService,
    RecordingService,
    prepareTranscriptionService,
    ShortcutManager
  } = loadWindowsSmokeRuntimeFactories();
  const platformApi = options.platformApi || createPlatformApi({ platform: runtimeEnv.platform });
  const logger = getLogger(options.logger);
  const trigger = options.trigger || DEFAULT_TRIGGER;
  const shortcutManager = options.shortcutManager || new ShortcutManager({
    key: trigger,
    longPressDuration: options.longPressDuration || 500,
    onInfo: (message) => logger.info('[Shortcut]', message),
    onError: (message, error) => logger.error('[Shortcut]', message, error)
  });
  const shortcutService = options.shortcutService || new ShortcutService({
    shortcutManager
  });
  const recordingService = options.recordingService || new RecordingService({
    audioRecorder: options.audioRecorder || platformApi.getAudioRecorder({
      ffmpegBinary: runtimePaths.ffmpegBinPath,
      sampleRate: 16000,
      channels: 1
    })
  });
  const transcriptionService = options.transcriptionService || await prepareTranscriptionService({
    config: options.config || {},
    dialog: options.dialog,
    BrowserWindow: options.BrowserWindow,
    logger,
    modelDownloader: options.modelDownloader,
    runtimeEnv,
    runtimePaths,
    whisperEngine: options.whisperEngine
  });

  if (!transcriptionService) {
    throw new Error('Windows smoke command requires a transcription service');
  }

  return {
    runtimeEnv,
    runtimePaths,
    platformApi,
    logger,
    shortcutService,
    recordingService,
    transcriptionService,
    clipboardDelivery: createClipboardDelivery(options)
  };
}

function createWindowsSmokeCommand(options = {}) {
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const helpText = renderWindowsSmokeUsage();

  async function buildRunner() {
    const smokeRunnerOptions = await createWindowsSmokeCommandRunner(options);

    return createWindowsSmokeRunner({
      runtimeEnv: smokeRunnerOptions.runtimeEnv,
      logger: smokeRunnerOptions.logger,
      trigger: options.trigger || DEFAULT_TRIGGER,
      shortcutService: smokeRunnerOptions.shortcutService,
      recordingService: smokeRunnerOptions.recordingService,
      transcriptionService: smokeRunnerOptions.transcriptionService,
      clipboardDelivery: smokeRunnerOptions.clipboardDelivery,
      runtimePaths: smokeRunnerOptions.runtimePaths,
      audioRecorder: options.audioRecorder || smokeRunnerOptions.platformApi.getAudioRecorder({
        ffmpegBinary: smokeRunnerOptions.runtimePaths.ffmpegBinPath,
        sampleRate: 16000,
        channels: 1
      }),
      permissionGateway: options.permissionGateway || smokeRunnerOptions.platformApi.getPermissionGateway({
        systemPreferences: options.systemPreferences
      }),
      hookProbe: options.hookProbe,
      fileExists: options.fileExists,
      preflight: options.preflight
    });
  }

  async function run(argv = []) {
    if (argv.includes('--help') || argv.includes('-h')) {
      stdout.write(`${helpText}\n`);
      return {
        exitCode: 0,
        output: helpText
      };
    }

    const runner = await buildRunner();
    const context = await runner.start();
    return {
      exitCode: 0,
      runner,
      context
    };
  }

  return {
    helpText,
    buildRunner,
    run
  };
}

async function runWindowsSmokeCli(argv = process.argv.slice(2), options = {}) {
  const command = createWindowsSmokeCommand(options);
  const stderr = options.stderr || process.stderr;

  try {
    return await command.run(argv);
  } catch (error) {
    const logger = getLogger(options.logger);

    try {
      logger.error('[Windows Smoke] Command failed:', error);
    } catch {
      try {
        stderr.write(`${error.message}\n`);
      } catch {
        // Best-effort diagnostics only.
      }
    }

    return {
      exitCode: 1,
      error
    };
  }
}

function createWindowsSmokeRunner(options = {}) {
  const runtimeEnv = options.runtimeEnv || { platform: process.platform };
  const logger = getLogger(options.logger);
  const onError = typeof options.onError === 'function' ? options.onError : null;
  const trigger = options.trigger || DEFAULT_TRIGGER;
  const shortcutService = options.shortcutService;
  const recordingService = options.recordingService;
  const transcriptionService = options.transcriptionService;
  const clipboardDelivery = options.clipboardDelivery;
  const preflightHook = options.preflight;
  const runtimePaths = options.runtimePaths || null;
  const audioRecorder = options.audioRecorder || null;
  const permissionGateway = options.permissionGateway || null;
  const hookProbe = options.hookProbe || null;
  const fileExists = options.fileExists || null;
  let gestureState = 'idle';
  let releasePending = false;

  function getSmokeContext() {
    return {
      runtimeEnv,
      trigger,
      shortcutService,
      recordingService,
      transcriptionService,
      clipboardDelivery
    };
  }

  function reportFailure(stage, error, details = {}) {
    const diagnostic = {
      stage,
      details,
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : null
    };

    try {
      logger.error('[Windows Smoke] Failure:', diagnostic);
    } catch (loggerError) {
      try {
        console.error('[Windows Smoke] logger.error failed while reporting failure:', loggerError);
      } catch {
        // Best-effort diagnostics only.
      }
    }

    if (onError) {
      try {
        onError(diagnostic);
      } catch (hookError) {
        try {
          console.error('[Windows Smoke] onError hook failed while reporting failure:', hookError);
        } catch {
          // Best-effort diagnostics only.
        }
      }
    }
  }

  function safeInfo(message, ...args) {
    try {
      logger.info(message, ...args);
    } catch (error) {
      try {
        console.error('[Windows Smoke] logger.info failed:', error);
      } catch {
        // Best-effort diagnostics only.
      }
    }
  }

  async function runLongPressStart() {
    safeInfo('[Windows Smoke] Long press started');
    gestureState = 'starting';
    releasePending = false;

    try {
      await recordingService.start();
      if (gestureState === 'starting') {
        gestureState = 'recording';
      }

      if (releasePending && gestureState === 'recording') {
        releasePending = false;
        await completeLongPressEnd();
      }
    } catch (error) {
      gestureState = 'start-failed';
      releasePending = false;
      reportFailure('recording:start', error);
    }
  }

  async function completeLongPressEnd() {
    if (gestureState === 'starting') {
      releasePending = true;
      return;
    }

    if (gestureState !== 'recording') {
      gestureState = 'idle';
      return;
    }

    gestureState = 'stopping';
    releasePending = false;

    let audioPath;
    try {
      audioPath = await recordingService.stop();
    } catch (error) {
      gestureState = 'idle';
      reportFailure('recording:stop', error);
      return;
    }

    let transcript;
    try {
      transcript = await transcriptionService.transcribe(audioPath);
    } catch (error) {
      gestureState = 'idle';
      reportFailure('transcription:transcribe', error, { audioPath });
      return;
    }

    try {
      await clipboardDelivery.deliverText(transcript);
    } catch (error) {
      gestureState = 'idle';
      reportFailure('clipboard:deliver', error, { audioPath, transcript });
      return;
    }

    gestureState = 'idle';
    safeInfo('[Windows Smoke] Transcript:', transcript);
  }

  async function runLongPressEnd() {
    safeInfo('[Windows Smoke] Long press ended');
    await completeLongPressEnd();
  }

  async function preflight() {
    assertWindowsHost(runtimeEnv);
    validateSmokeDependencies({
      shortcutService,
      recordingService,
      transcriptionService,
      clipboardDelivery
    });

    if (typeof preflightHook === 'function') {
      return preflightHook(getSmokeContext());
    }

    assertPreflightDependencies({
      runtimePaths,
      audioRecorder,
      permissionGateway,
      hookProbe,
      fileExists
    });

    const preflightRunner = createWindowsSmokePreflight({
      runtimeEnv,
      runtimePaths: runtimePaths || {},
      audioRecorder,
      permissionGateway,
      hookProbe,
      fileExists
    });

    return preflightRunner.run();
  }

  async function start() {
    assertWindowsHost(runtimeEnv);
    safeInfo(STARTUP_BANNER);
    safeInfo(`[Windows Smoke] Listening for long-press ${trigger}`);

    await preflight();

    shortcutService.onLongPressStart(() => {
      void runLongPressStart();
    });

    shortcutService.onLongPressEnd(() => {
      void runLongPressEnd();
    });

    await shortcutService.start();

    return getSmokeContext();
  }

  return {
    preflight,
    start
  };
}

module.exports = {
  STARTUP_BANNER,
  DEFAULT_TRIGGER,
  renderWindowsSmokeUsage,
  createWindowsSmokeRunner,
  createWindowsSmokeCommand,
  runWindowsSmokeCli
};

if (require.main === module) {
  void runWindowsSmokeCli().then((result) => {
    if (result && !result.runner && typeof result.exitCode === 'number') {
      try {
        const { app } = require('electron');
        if (app && typeof app.exit === 'function') {
          app.exit(result.exitCode);
          return;
        }
      } catch {
        // Fall back to process exit outside Electron runtime.
      }
      process.exit(result.exitCode);
    }
  });
}
