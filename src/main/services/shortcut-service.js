class ShortcutService {
  constructor(options = {}) {
    this.shortcutManager = options.shortcutManager;
  }

  async start() {
    if (typeof this.shortcutManager.start === 'function') {
      return this.shortcutManager.start();
    }

    return this.shortcutManager.init();
  }

  stop() {
    if (typeof this.shortcutManager.stop === 'function') {
      return this.shortcutManager.stop();
    }

    return this.shortcutManager.destroy();
  }

  onLongPressStart(handler) {
    this.shortcutManager.on('longPressStart', handler);
    return this;
  }

  onLongPressEnd(handler) {
    this.shortcutManager.on('longPressEnd', handler);
    return this;
  }
}

module.exports = ShortcutService;
