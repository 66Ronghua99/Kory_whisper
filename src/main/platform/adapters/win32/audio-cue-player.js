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
