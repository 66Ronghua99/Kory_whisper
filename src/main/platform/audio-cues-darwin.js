/**
 * macOS audio cue player using system alert sounds
 * Deps: child_process
 * Used By: platform/index.js
 * Last Updated: 2026-03-23
 */

const { exec } = require('child_process');

class AudioCuePlayerDarwin {
  constructor(options = {}) {
    this.runCommand = options.runCommand || this.execCommand;
  }

  async playRecordingStart() {
    await this.playSystemCue('recording-start');
  }

  async playOutputReady() {
    await this.playSystemCue('output-ready');
  }

  async playSystemCue(cueName) {
    try {
      await this.runCommand('osascript -e "beep"');
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
