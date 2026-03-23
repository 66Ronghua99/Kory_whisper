const test = require('node:test');
const assert = require('node:assert/strict');

const platform = require('../src/main/platform/index.js');

test('platform selector reports the active runtime platform flags consistently', () => {
  assert.equal(typeof platform.platform, 'string');
  assert.equal(platform.isMac, process.platform === 'darwin');
  assert.equal(platform.isWindows, process.platform === 'win32');
  assert.equal(platform.isLinux, process.platform === 'linux');
});

test('platform selector returns adapter instances with the expected public methods', () => {
  const audioCuePlayer = platform.getAudioCuePlayer({ enabled: false });
  const inputSimulator = platform.getInputSimulator({ appendSpace: true });
  const audioRecorder = platform.getAudioRecorder({ sampleRate: 16000, channels: 1 });

  assert.equal(typeof audioCuePlayer.playRecordingStart, 'function');
  assert.equal(typeof audioCuePlayer.playOutputReady, 'function');
  assert.equal(typeof inputSimulator.typeText, 'function');
  assert.equal(typeof audioRecorder.start, 'function');
  assert.equal(typeof audioRecorder.stop, 'function');
});
