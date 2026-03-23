/**
 * Windows audio cue player placeholder
 * Deps: none
 * Used By: platform/index.js
 * Last Updated: 2026-03-23
 */

class AudioCuePlayerWin32 {
  constructor(options = {}) {
    this.updateOptions(options);
  }

  updateOptions(options = {}) {
    this.enabled = options.enabled !== false;
    this.recordingStartSound = options.recordingStartSound || 'Tink';
    this.outputReadySound = options.outputReadySound || 'Glass';
  }

  async playRecordingStart() {
    return undefined;
  }

  async playOutputReady() {
    return undefined;
  }
}

module.exports = AudioCuePlayerWin32;
