const test = require('node:test');
const assert = require('node:assert/strict');

const AudioCuePlayerDarwin = require('../src/main/platform/audio-cues-darwin.js');
const AudioCuePlayerWin32 = require('../src/main/platform/audio-cues-win32.js');
const ConfigManager = require('../src/main/config-manager.js');

test('darwin audio cue player uses Tink and Glass as the default system sounds', async () => {
  const commands = [];
  const player = new AudioCuePlayerDarwin({
    runCommand(command) {
      commands.push(command);
      return Promise.resolve();
    }
  });

  await player.playRecordingStart();
  await player.playOutputReady();

  assert.deepEqual(commands, [
    'afplay "/System/Library/Sounds/Tink.aiff"',
    'afplay "/System/Library/Sounds/Glass.aiff"'
  ]);
});

test('darwin audio cue player uses configured sound names when provided', async () => {
  const commands = [];
  const player = new AudioCuePlayerDarwin({
    recordingStartSound: 'Pop',
    outputReadySound: 'Ping',
    runCommand(command) {
      commands.push(command);
      return Promise.resolve();
    }
  });

  await player.playRecordingStart();
  await player.playOutputReady();

  assert.deepEqual(commands, [
    'afplay "/System/Library/Sounds/Pop.aiff"',
    'afplay "/System/Library/Sounds/Ping.aiff"'
  ]);
});

test('win32 audio cue player exposes the same cue methods as no-op calls', async () => {
  const player = new AudioCuePlayerWin32();

  await assert.doesNotReject(() => player.playRecordingStart());
  await assert.doesNotReject(() => player.playOutputReady());
});

test('config manager defaults audio cues to enabled with Tink and Glass', () => {
  const configManager = new ConfigManager();
  const config = configManager.getDefaultConfig();

  assert.deepEqual(config.audioCues, {
    enabled: true,
    recordingStartSound: 'Tink',
    outputReadySound: 'Glass'
  });
});
