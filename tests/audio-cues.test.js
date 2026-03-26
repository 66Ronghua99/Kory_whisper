const test = require('node:test');
const assert = require('node:assert/strict');

const AudioCuePlayerDarwin = require('../src/main/platform/audio-cues-darwin.js');
const AudioCuePlayerWin32 = require('../src/main/platform/audio-cues-win32.js');
const ConfigManager = require('../src/main/config/config-manager.js');

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

test('darwin audio cue player falls back to defaults for unsupported sound names', async () => {
  const commands = [];
  const player = new AudioCuePlayerDarwin({
    recordingStartSound: 'Unknown',
    outputReadySound: 'AlsoUnknown',
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

test('darwin audio cue player does not invoke afplay when disabled', async () => {
  const commands = [];
  const player = new AudioCuePlayerDarwin({
    enabled: false,
    runCommand(command) {
      commands.push(command);
      return Promise.resolve();
    }
  });

  await player.playRecordingStart();
  await player.playOutputReady();

  assert.deepEqual(commands, []);
});

test('darwin audio cue player swallows playback failures after logging', async () => {
  const errors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  const player = new AudioCuePlayerDarwin({
    runCommand() {
      return Promise.reject(new Error('afplay failed'));
    }
  });

  try {
    await assert.doesNotReject(() => player.playRecordingStart());
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Failed to play cue: recording-start/);
});

test('win32 audio cue player maps to fixed Windows system sounds without exposing selectable sound names', async () => {
  const commands = [];
  const player = new AudioCuePlayerWin32({
    runCommand(command) {
      commands.push(command);
      return Promise.resolve();
    }
  });

  await player.playRecordingStart();
  await player.playOutputReady();

  assert.deepEqual(commands, [
    '[System.Media.SystemSounds]::Asterisk.Play()',
    '[System.Media.SystemSounds]::Exclamation.Play()'
  ]);
});

test('config manager derives audio cue defaults from the active platform profile contract', () => {
  const darwinConfigManager = new ConfigManager({
    runtimeEnv: {
      platform: 'darwin',
      homeDir: '/tmp/kory-darwin'
    }
  });
  const win32ConfigManager = new ConfigManager({
    runtimeEnv: {
      platform: 'win32',
      homeDir: 'C:\\Users\\tester'
    }
  });

  assert.deepEqual(darwinConfigManager.getDefaultConfig().audioCues, {
    enabled: true,
    recordingStartSound: 'Tink',
    outputReadySound: 'Glass'
  });
  assert.deepEqual(win32ConfigManager.getDefaultConfig().audioCues, {
    enabled: true,
    recordingStartSound: 'Asterisk',
    outputReadySound: 'Exclamation'
  });
});
