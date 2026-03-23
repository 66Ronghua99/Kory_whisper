class InjectionService {
  constructor(options = {}) {
    this.inputSimulator = options.inputSimulator;
  }

  async deliverText(text) {
    return this.inputSimulator.typeText(text);
  }

  updateOptions(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'appendSpace')) {
      this.inputSimulator.appendSpace = options.appendSpace !== false;
    }
  }
}

module.exports = InjectionService;
