class CueService {
  constructor(options = {}) {
    this.audioCuePlayer = options.audioCuePlayer;
  }

  async playRecordingStart() {
    return this.audioCuePlayer.playRecordingStart();
  }

  async playOutputReady() {
    return this.audioCuePlayer.playOutputReady();
  }

  updateOptions(options = {}) {
    if (typeof this.audioCuePlayer.updateOptions === 'function') {
      this.audioCuePlayer.updateOptions(options);
    }
  }
}

module.exports = CueService;
