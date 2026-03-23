class RecordingService {
  constructor(options = {}) {
    this.audioRecorder = options.audioRecorder;
  }

  async start() {
    return this.audioRecorder.start();
  }

  async stop() {
    return this.audioRecorder.stop();
  }
}

module.exports = RecordingService;
