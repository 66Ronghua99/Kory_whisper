class TranscriptionService {
  constructor(options = {}) {
    this.whisperEngine = options.whisperEngine;
  }

  async transcribe(audioPath) {
    return this.whisperEngine.transcribe(audioPath);
  }

  updateRuntimeOptions(options = {}) {
    if (typeof this.whisperEngine.updateRuntimeOptions === 'function') {
      this.whisperEngine.updateRuntimeOptions(options);
    }
  }

  async dispose() {
    if (typeof this.whisperEngine.stop === 'function') {
      await this.whisperEngine.stop();
      return;
    }

    if (this.whisperEngine.localLLM && typeof this.whisperEngine.localLLM.stopServer === 'function') {
      await this.whisperEngine.localLLM.stopServer();
    }
  }
}

module.exports = TranscriptionService;
