/**
 * Deps: uiohook-napi
 * Used By: composition root and Windows smoke runner
 * Last Updated: 2026-03-24
 */

const { uIOhook, UiohookKey } = require('uiohook-napi');
const { EventEmitter } = require('events');

class ShortcutManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.key = options.key || 'RIGHT COMMAND';
    this.uiohook = options.uiohook || uIOhook;
    this.keyTable = options.keyTable || UiohookKey;
    this.keyCode = this.mapKeyToCode(this.key);
    this.longPressDuration = options.longPressDuration || options.duration || 500;
    this.onInfo = options.onInfo || null;
    this.onError = options.onError || null;
    this.pressTimer = null;
    this.isRecording = false;
    this.isKeyDown = false;
    this.keyDownHandler = null;
    this.keyUpHandler = null;
  }

  logInfo(message, details) {
    if (typeof this.onInfo !== 'function') {
      return;
    }

    try {
      this.onInfo(message, details);
    } catch {
      // Logging must never break shortcut handling.
    }
  }

  logError(message, error) {
    if (typeof this.onError !== 'function') {
      return;
    }

    try {
      this.onError(message, error);
    } catch {
      // Logging must never break shortcut handling.
    }
  }

  mapKeyToCode(key) {
    const keyMap = {
      'LEFT COMMAND': this.keyTable.Meta,
      'RIGHT COMMAND': this.keyTable.MetaRight,
      'LEFT OPTION': this.keyTable.Alt,
      'RIGHT OPTION': this.keyTable.AltRight,
      'LEFT CONTROL': this.keyTable.Ctrl,
      'RIGHT CONTROL': this.keyTable.CtrlRight,
      'LEFT SHIFT': this.keyTable.Shift,
      'RIGHT SHIFT': this.keyTable.ShiftRight,
      'F13': this.keyTable.F13,
      'F14': this.keyTable.F14,
      'F15': this.keyTable.F15,
      'F16': this.keyTable.F16,
      'F17': this.keyTable.F17,
      'F18': this.keyTable.F18,
      'F19': this.keyTable.F19,
      'F20': this.keyTable.F20,
      'F21': this.keyTable.F21,
      'F22': this.keyTable.F22,
      'F23': this.keyTable.F23,
      'F24': this.keyTable.F24
    };

    return keyMap[key] || this.keyTable.MetaRight;
  }

  async init() {
    this.logInfo(`Initializing with key ${this.key}`, { keyCode: this.keyCode });

    try {
      this.keyDownHandler = (event) => {
        const isTargetKey = event.keycode === this.keyCode;
        if (!isTargetKey || this.isKeyDown) {
          return;
        }

        this.logInfo(`Target key pressed ${this.key}`, { keyCode: event.keycode });
        this.isKeyDown = true;
        this.handleKeyDown();
      };

      this.keyUpHandler = (event) => {
        const isTargetKey = event.keycode === this.keyCode;
        if (!isTargetKey || !this.isKeyDown) {
          return;
        }

        this.logInfo(`Target key released ${this.key}`, { keyCode: event.keycode });
        this.isKeyDown = false;
        this.handleKeyUp();
      };

      this.uiohook.on('keydown', this.keyDownHandler);
      this.uiohook.on('keyup', this.keyUpHandler);
      this.uiohook.start();

      this.logInfo('Listener registered successfully');
    } catch (error) {
      this.logError('Failed to initialize keyboard listener', error);
      throw error;
    }
  }

  async start() {
    return this.init();
  }

  handleKeyDown() {
    this.pressTimer = setTimeout(() => {
      if (this.isKeyDown && !this.isRecording) {
        this.isRecording = true;
        this.logInfo('Long press detected');
        this.emit('longPressStart');
      }
    }, this.longPressDuration);
  }

  handleKeyUp() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }

    if (this.isRecording) {
      this.isRecording = false;
      this.logInfo('Emitting longPressEnd');
      this.emit('longPressEnd');
    }
  }

  destroy() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }

    try {
      if (this.keyDownHandler && typeof this.uiohook.off === 'function') {
        this.uiohook.off('keydown', this.keyDownHandler);
      }
      if (this.keyUpHandler && typeof this.uiohook.off === 'function') {
        this.uiohook.off('keyup', this.keyUpHandler);
      }
      this.uiohook.stop();
    } catch (error) {
      this.logError('Error stopping keyboard listener', error);
    }

    this.isKeyDown = false;
    this.isRecording = false;
    this.keyDownHandler = null;
    this.keyUpHandler = null;
  }

  stop() {
    return this.destroy();
  }
}

module.exports = ShortcutManager;
