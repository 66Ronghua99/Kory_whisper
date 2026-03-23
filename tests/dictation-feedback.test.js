const test = require('node:test');
const assert = require('node:assert/strict');

const {
  startRecordingFeedback,
  announceOutputReady
} = require('../src/main/dictation-feedback.js');

test('startRecordingFeedback marks recording only after recorder start succeeds', async () => {
  const events = [];
  let finishStart;

  const startPromise = new Promise((resolve) => {
    finishStart = resolve;
  });

  const workflowPromise = startRecordingFeedback({
    audioRecorder: {
      async start() {
        events.push('recorder:start:begin');
        await startPromise;
        events.push('recorder:start:done');
      }
    },
    trayManager: {
      setRecordingState(isRecording) {
        events.push(`tray:recording:${isRecording}`);
      }
    },
    audioCuePlayer: {
      async playRecordingStart() {
        events.push('cue:recording-start');
      }
    }
  });

  await Promise.resolve();
  assert.deepEqual(events, ['recorder:start:begin']);

  finishStart();
  await workflowPromise;
  await Promise.resolve();

  assert.deepEqual(events, [
    'recorder:start:begin',
    'recorder:start:done',
    'tray:recording:true',
    'cue:recording-start'
  ]);
});

test('announceOutputReady updates tray success without waiting for cue completion', async () => {
  const events = [];
  let resolveCue;

  const cuePromise = new Promise((resolve) => {
    resolveCue = resolve;
  });

  const announcePromise = announceOutputReady({
    trayManager: {
      showSuccessState() {
        events.push('tray:success');
      }
    },
    audioCuePlayer: {
      async playOutputReady() {
        events.push('cue:output-ready:start');
        await cuePromise;
        events.push('cue:output-ready:end');
      }
    }
  });

  await announcePromise;
  assert.deepEqual(events, ['tray:success', 'cue:output-ready:start']);

  resolveCue();
  await Promise.resolve();

  assert.deepEqual(events, [
    'tray:success',
    'cue:output-ready:start',
    'cue:output-ready:end'
  ]);
});
