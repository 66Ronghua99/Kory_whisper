const fs = require('fs');

class WindowsSmokePreflightError extends Error {
  constructor(code, message, details = {}, guidance = []) {
    super(message);
    this.name = 'WindowsSmokePreflightError';
    this.code = code;
    this.details = details;
    this.guidance = guidance;
  }
}

function createWindowsSmokePreflight(options = {}) {
  const runtimeEnv = options.runtimeEnv || { platform: process.platform };
  const runtimePaths = options.runtimePaths || {};
  const audioRecorder = options.audioRecorder || null;
  const permissionGateway = options.permissionGateway || null;
  const hookProbe = options.hookProbe || null;
  const fileExists = options.fileExists || fs.existsSync;

  function requireDependency(name, dependency, methodNames = []) {
    if (!dependency) {
      throw new WindowsSmokePreflightError(
        `missing-${name}`,
        `Windows smoke preflight: ${name} is required`
      );
    }

    for (const methodName of methodNames) {
      if (typeof dependency[methodName] !== 'function') {
        throw new WindowsSmokePreflightError(
          `invalid-${name}`,
          `Windows smoke preflight: ${name}.${methodName} is required`
        );
      }
    }

    return dependency;
  }

  function assertWindowsHost() {
    if (runtimeEnv.platform !== 'win32') {
      throw new WindowsSmokePreflightError(
        'unsupported-host',
        'Windows smoke runner is Windows-only'
      );
    }
  }

  function assertWhisperBinary() {
    if (!runtimePaths.whisperBinPath) {
      throw new WindowsSmokePreflightError(
        'missing-whisper-cli',
        'Repository-managed whisper-cli.exe is missing',
        {
          whisperBinPath: runtimePaths.whisperBinPath || null
        }
      );
    }

    if (!fileExists(runtimePaths.whisperBinPath)) {
      throw new WindowsSmokePreflightError(
        'missing-whisper-cli',
        `Repository-managed whisper-cli.exe is missing: ${runtimePaths.whisperBinPath}`,
        {
          whisperBinPath: runtimePaths.whisperBinPath
        }
      );
    }
  }

  function assertFfmpegBinary() {
    if (!audioRecorder || typeof audioRecorder.resolveFfmpegBinary !== 'function') {
      throw new WindowsSmokePreflightError(
        'missing-ffmpeg-probe',
        'Windows smoke preflight requires audioRecorder.resolveFfmpegBinary'
      );
    }

    const ffmpegBinary = audioRecorder.resolveFfmpegBinary();
    if (!ffmpegBinary) {
      throw new WindowsSmokePreflightError(
        'missing-ffmpeg',
        'ffmpeg is missing for Windows recording',
        {
          ffmpegBinary: null
        }
      );
    }

    if (!fileExists(ffmpegBinary)) {
      throw new WindowsSmokePreflightError(
        'invalid-ffmpeg',
        `ffmpeg is missing or invalid at ${ffmpegBinary}`,
        {
          ffmpegBinary
        }
      );
    }

    return ffmpegBinary;
  }

  function assertInputDevice() {
    if (!audioRecorder || typeof audioRecorder.resolveInputDevice !== 'function') {
      return null;
    }

    const inputDevice = audioRecorder.resolveInputDevice();
    if (!inputDevice) {
      throw new WindowsSmokePreflightError(
        'missing-audio-input-device',
        'No DirectShow microphone input device is available for Windows recording',
        {
          inputDevice: null
        }
      );
    }

    return inputDevice;
  }

  async function assertHookProbe() {
    if (!hookProbe) {
      return null;
    }

    try {
      return await hookProbe();
    } catch (error) {
      throw new WindowsSmokePreflightError(
        'hook-init-failed',
        `Windows hook initialization failed: ${error.message}`,
        {
          reason: error.message
        }
      );
    }
  }

  async function assertMicrophoneGuidance() {
    requireDependency('permissionGateway', permissionGateway, ['check']);

    const permissionState = await permissionGateway.check();
    const guidanceSurfaces = typeof permissionGateway.getGuidanceSurfaces === 'function'
      ? permissionGateway.getGuidanceSurfaces(permissionState)
      : [];

    if (permissionState && permissionState.microphoneGranted === false) {
      const guidance = typeof permissionGateway.getMicrophoneGuidance === 'function'
        ? [permissionGateway.getMicrophoneGuidance(permissionState)]
        : [];

      const error = new WindowsSmokePreflightError(
        'microphone-blocked',
        'Microphone access is blocked',
        {
          permissionState,
          guidanceSurfaces
        },
        guidance
      );
      error.guidanceSurfaces = guidanceSurfaces;
      throw error;
    }

    return {
      ...permissionState,
      guidanceSurfaces,
      guidance: []
    };
  }

  async function run() {
    assertWindowsHost();
    await assertHookProbe();
    assertWhisperBinary();
    const ffmpegBinary = assertFfmpegBinary();
    const inputDevice = assertInputDevice();
    const permissionState = await assertMicrophoneGuidance();

    return {
      runtimeEnv,
      runtimePaths,
      ffmpegBinary,
      inputDevice,
      permissionState
    };
  }

  return {
    run,
    assertWindowsHost,
    assertWhisperBinary,
    assertFfmpegBinary,
    assertInputDevice,
    assertHookProbe,
    assertMicrophoneGuidance
  };
}

module.exports = {
  WindowsSmokePreflightError,
  createWindowsSmokePreflight
};
