/**
 * macOS audio cue player using system alert sounds
 * Deps: child_process
 * Used By: platform/index.js
 * Last Updated: 2026-03-23
 */

const { exec } = require('child_process');

const DEFAULT_RECORDING_START_SOUND = 'Tink';
const DEFAULT_OUTPUT_READY_SOUND = 'Glass';
const SUPPORTED_SOUND_NAMES = new Set([
  'Tink',
  'Glass',
  'Pop',
  'Ping',
  'Hero'
]);

class AudioCuePlayerDarwin {
  constructor(options = {}) {
    this.runCommand = options.runCommand || this.execCommand;
    this.updateOptions(options);
  }

  updateOptions(options = {}) {
    this.enabled = options.enabled !== false;
    this.recordingStartSound = this.normalizeSoundName(
      options.recordingStartSound,
      DEFAULT_RECORDING_START_SOUND
    );
    this.outputReadySound = this.normalizeSoundName(
      options.outputReadySound,
      DEFAULT_OUTPUT_READY_SOUND
    );
  }

  async playRecordingStart() {
    await this.playSystemCue('recording-start', this.recordingStartSound);
  }

  async playOutputReady() {
    await this.playSystemCue('output-ready', this.outputReadySound);
  }

  normalizeSoundName(soundName, fallback) {
    if (SUPPORTED_SOUND_NAMES.has(soundName)) {
      return soundName;
    }

    return fallback;
  }

  async playSystemCue(cueName, soundName) {
    if (!this.enabled) {
      return;
    }

    try {
      await this.runCommand(`afplay "/System/Library/Sounds/${soundName}.aiff"`);
    } catch (error) {
      console.error('[AudioCue] Failed to play cue:', cueName, error);
    }
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

module.exports = AudioCuePlayerDarwin;
