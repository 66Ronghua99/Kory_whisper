const test = require('node:test');
const assert = require('node:assert/strict');

const AudioCuePlayerDarwin = require('../src/main/platform/audio-cues-darwin.js');
const AudioCuePlayerWin32 = require('../src/main/platform/audio-cues-win32.js');

test('darwin audio cue player runs the system cue command for recording start and output-ready events', async () => {
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
    'osascript -e "beep"',
    'osascript -e "beep"'
  ]);
});

test('win32 audio cue player exposes the same cue methods as no-op calls', async () => {
  const player = new AudioCuePlayerWin32();

  await assert.doesNotReject(() => player.playRecordingStart());
  await assert.doesNotReject(() => player.playOutputReady());
});
