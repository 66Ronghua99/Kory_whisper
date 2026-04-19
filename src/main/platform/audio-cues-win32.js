/**
 * Windows audio cue player using native system sounds
 * Deps: child_process
 * Used By: tests/audio-cues.test.js
 * Last Updated: 2026-03-26
 */

const { exec } = require('child_process');

class AudioCuePlayerWin32 {
  constructor(options = {}) {
    this.runCommand = options.runCommand || this.execCommand;
    this.updateOptions(options);
  }

  updateOptions(options = {}) {
    this.enabled = options.enabled !== false;
    this.recordingStartSound = 'Asterisk';
    this.outputReadySound = 'Exclamation';
  }

  async playRecordingStart() {
    await this.playSystemCue('recording-start', this.recordingStartSound);
  }

  async playOutputReady() {
    await this.playSystemCue('output-ready', this.outputReadySound);
  }

  async playSystemCue(cueName, soundName) {
    if (!this.enabled) {
      return;
    }

    try {
      await this.runCommand(`[System.Media.SystemSounds]::${soundName}.Play()`);
    } catch (error) {
      console.error('[AudioCue] Failed to play cue:', cueName, error);
    }
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(`powershell.exe -NoProfile -NonInteractive -Command "${command}"`, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

module.exports = AudioCuePlayerWin32;
