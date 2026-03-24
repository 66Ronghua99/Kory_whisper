const test = require('node:test');
const assert = require('node:assert/strict');

const DictationService = require('../src/main/services/dictation-service.js');

function createBlockedReadiness() {
  return {
    isReady: false,
    firstRunNeedsOnboarding: true,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'microphone'
      },
      accessibility: {
        status: 'missing',
        reason: 'required-for-text-injection',
        cta: 'open-settings-and-recheck',
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
}

function createReadyReadiness() {
  return {
    isReady: true,
    firstRunNeedsOnboarding: false,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'microphone'
      },
      accessibility: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'accessibility'
      },
      inputMonitoring: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'input-monitoring'
      }
    }
  };
}

function createInputMonitoringValidationReadiness() {
  return {
    isReady: false,
    firstRunNeedsOnboarding: true,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'microphone'
      },
      accessibility: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'accessibility'
      },
      inputMonitoring: {
        status: 'unknown',
        reason: 'required-for-global-hotkey',
        cta: 'open-settings-and-recheck',
        settingsTarget: 'input-monitoring'
      }
    }
  };
}

test('dictation start refuses to record and opens the matching settings surface when readiness is blocked', async () => {
  const events = [];
  const service = new DictationService({
    permissionService: {
      async getReadiness() {
        events.push('permission:get-readiness');
        return createBlockedReadiness();
      },
      ensureMicrophoneAccess() {
        throw new Error('dictation should gate on shared readiness, not microphone-only access');
      },
      openSettings(surface) {
        events.push(`permission:open:${surface}`);
      }
    },
    recordingService: {
      async start() {
        events.push('recording:start');
      },
      async stop() {
        events.push('recording:stop');
      }
    },
    transcriptionService: {
      async transcribe() {
        events.push('transcribe');
        return 'text';
      }
    },
    injectionService: {
      async deliverText() {
        events.push('inject');
      }
    },
    cueService: {
      async playRecordingStart() {
        events.push('cue:recording-start');
      },
      async playOutputReady() {
        events.push('cue:output-ready');
      }
    },
    trayService: {
      showPermissionBlocked(readiness) {
        events.push(`tray:blocked:${readiness.isReady}`);
      },
      showError(message) {
        events.push(`tray:error:${message}`);
      },
      openPermissionOnboarding() {
        events.push('tray:onboarding');
      },
      setRecording(isRecording) {
        events.push(`tray:recording:${isRecording}`);
      },
      showProcessing() {
        events.push('tray:processing');
      },
      showSuccess() {
        events.push('tray:success');
      }
    },
    logger: {
      info() {},
      error() {}
    }
  });

  await service.handleShortcutStart();

  assert.deepEqual(events, [
    'permission:get-readiness',
    'tray:blocked:false',
    'tray:recording:false',
    'tray:error:语音输入当前不可用，请先开启辅助功能权限',
    'permission:open:accessibility'
  ]);
  assert.equal(service.isRecording, false);
});

test('dictation start still records when readiness is ready', async () => {
  const events = [];
  const service = new DictationService({
    permissionService: {
      async getReadiness() {
        events.push('permission:get-readiness');
        return createReadyReadiness();
      },
      ensureMicrophoneAccess() {
        throw new Error('dictation should gate on shared readiness, not microphone-only access');
      }
    },
    recordingService: {
      async start() {
        events.push('recording:start');
      },
      async stop() {
        events.push('recording:stop');
      }
    },
    transcriptionService: {
      async transcribe() {
        events.push('transcribe');
        return 'text';
      }
    },
    injectionService: {
      async deliverText() {
        events.push('inject');
      }
    },
    cueService: {
      async playRecordingStart() {
        events.push('cue:recording-start');
      },
      async playOutputReady() {
        events.push('cue:output-ready');
      }
    },
    trayService: {
      showPermissionBlocked() {
        events.push('tray:blocked');
      },
      setRecording(isRecording) {
        events.push(`tray:recording:${isRecording}`);
      },
      showProcessing() {
        events.push('tray:processing');
      },
      showSuccess() {
        events.push('tray:success');
      },
      showError(message) {
        events.push(`tray:error:${message}`);
      }
    },
    logger: {
      info() {},
      error() {}
    }
  });

  await service.handleShortcutStart();

  assert.deepEqual(events, [
    'permission:get-readiness',
    'recording:start',
    'tray:recording:true',
    'cue:recording-start'
  ]);
  assert.equal(service.isRecording, true);
});

test('dictation start uses the first real shortcut press to validate unknown input monitoring instead of reopening settings', async () => {
  const events = [];
  let validated = false;
  const service = new DictationService({
    permissionService: {
      async getReadiness() {
        events.push('permission:get-readiness');
        return validated ? createReadyReadiness() : createInputMonitoringValidationReadiness();
      },
      setRuntimeSurfaceStatus(surface, status) {
        events.push(`permission:runtime:${surface}:${status}`);
        if (surface === 'inputMonitoring' && status === 'granted') {
          validated = true;
        }
      },
      openSettings(surface) {
        events.push(`permission:open:${surface}`);
      }
    },
    recordingService: {
      async start() {
        events.push('recording:start');
      },
      async stop() {
        events.push('recording:stop');
      }
    },
    transcriptionService: {
      async transcribe() {
        events.push('transcribe');
        return 'text';
      }
    },
    injectionService: {
      async deliverText() {
        events.push('inject');
      }
    },
    cueService: {
      async playRecordingStart() {
        events.push('cue:recording-start');
      },
      async playOutputReady() {
        events.push('cue:output-ready');
      }
    },
    trayService: {
      showPermissionBlocked(readiness) {
        events.push(`tray:blocked:${readiness.surfaces.inputMonitoring.status}`);
      },
      setPermissionReadiness(readiness) {
        events.push(`tray:set-readiness:${readiness.isReady}:${readiness.surfaces.inputMonitoring.status}`);
      },
      showError(message) {
        events.push(`tray:error:${message}`);
      },
      openPermissionOnboarding() {
        events.push('tray:onboarding');
      },
      setRecording(isRecording) {
        events.push(`tray:recording:${isRecording}`);
      },
      showProcessing() {
        events.push('tray:processing');
      },
      showSuccess() {
        events.push('tray:success');
      }
    },
    logger: {
      info() {},
      error() {}
    }
  });

  await service.handleShortcutStart();

  assert.deepEqual(events, [
    'permission:get-readiness',
    'permission:runtime:inputMonitoring:granted',
    'permission:get-readiness',
    'tray:set-readiness:true:granted'
  ]);
  assert.equal(service.isRecording, false);
});

test('dictation start opens the matching repair surface when accessibility is blocked', async () => {
  const events = [];
  const service = new DictationService({
    permissionService: {
      async getReadiness() {
        events.push('permission:get-readiness');
        return {
          isReady: false,
          firstRunNeedsOnboarding: true,
          refreshedAt: '2026-03-24T00:00:00.000Z',
          surfaces: {
            microphone: {
              status: 'granted',
              reason: null,
              cta: null,
              settingsTarget: 'microphone'
            },
            accessibility: {
              status: 'missing',
              reason: 'required-for-text-injection',
              cta: 'open-settings-and-recheck',
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
      },
      openSettings(surface) {
        events.push(`permission:open:${surface}`);
      }
    },
    recordingService: {
      async start() {
        events.push('recording:start');
      }
    },
    transcriptionService: {
      async transcribe() {
        events.push('transcribe');
      }
    },
    injectionService: {
      async deliverText() {
        events.push('inject');
      }
    },
    cueService: {
      async playRecordingStart() {
        events.push('cue:recording-start');
      },
      async playOutputReady() {
        events.push('cue:output-ready');
      }
    },
    trayService: {
      showPermissionBlocked(readiness) {
        events.push(`tray:blocked:${readiness.isReady}`);
      },
      setRecording(isRecording) {
        events.push(`tray:recording:${isRecording}`);
      },
      showError(message) {
        events.push(`tray:error:${message}`);
      },
      openPermissionOnboarding() {
        events.push('tray:onboarding');
      }
    },
    logger: {
      info() {},
      error() {}
    }
  });

  await service.handleShortcutStart();

  assert.deepEqual(events, [
    'permission:get-readiness',
    'tray:blocked:false',
    'tray:recording:false',
    'tray:error:语音输入当前不可用，请先开启辅助功能权限',
    'permission:open:accessibility'
  ]);
  assert.equal(service.isRecording, false);
});

test('dictation start fails closed and opens settings when readiness lookup throws', async () => {
  const events = [];
  const service = new DictationService({
    permissionService: {
      async getReadiness() {
        events.push('permission:get-readiness');
        throw new Error('readiness-check-failed');
      },
      openSettings(surface) {
        events.push(`permission:open:${surface}`);
      }
    },
    recordingService: {
      async start() {
        events.push('recording:start');
      }
    },
    transcriptionService: {
      async transcribe() {
        events.push('transcribe');
      }
    },
    injectionService: {
      async deliverText() {
        events.push('inject');
      }
    },
    cueService: {
      async playRecordingStart() {
        events.push('cue:recording-start');
      }
    },
    trayService: {
      showPermissionBlocked(readiness) {
        events.push(`tray:blocked:${readiness.surfaces.microphone.status}`);
      },
      showError(message) {
        events.push(`tray:error:${message}`);
      },
      openPermissionOnboarding() {
        events.push('tray:onboarding');
      },
      setRecording(isRecording) {
        events.push(`tray:recording:${isRecording}`);
      }
    },
    logger: {
      info() {},
      error() {}
    }
  });

  await service.handleShortcutStart();

  assert.deepEqual(events, [
    'permission:get-readiness',
    'tray:blocked:unknown',
    'tray:recording:false',
    'tray:error:语音输入当前不可用，请先开启麦克风权限',
    'permission:open:microphone'
  ]);
  assert.equal(service.isRecording, false);
});
