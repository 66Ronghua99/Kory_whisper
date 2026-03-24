/**
 * Deps: uiohook-napi
 * Used By: index.js
 * Last Updated: 2026-03-07
 *
 * 全局快捷键管理器 - 处理长按检测
 * 支持: LEFT/RIGHT COMMAND, OPTION, CONTROL, F13-F15, Fn 等
 */

const { uIOhook, UiohookKey } = require('uiohook-napi');
const { EventEmitter } = require('events');

class ShortcutManager extends EventEmitter {
  constructor(options = {}) {
    super();
    // 默认使用右 Command 键 (所有 Mac 都有)
    this.key = options.key || 'RIGHT COMMAND';
    this.keyCode = this.mapKeyToCode(this.key);
    this.longPressDuration = options.longPressDuration || options.duration || 500;
    this.onInfo = options.onInfo || null;
    this.onError = options.onError || null;
    this.pressTimer = null;
    this.isRecording = false;
    this.isKeyDown = false;
  }

  // 将配置键名映射到 keycode
  mapKeyToCode(key) {
    const keyMap = {
      'LEFT COMMAND': UiohookKey.Meta,
      'RIGHT COMMAND': UiohookKey.MetaRight,
      'LEFT OPTION': UiohookKey.Alt,
      'RIGHT OPTION': UiohookKey.AltRight,
      'LEFT CONTROL': UiohookKey.Ctrl,
      'RIGHT CONTROL': UiohookKey.CtrlRight,
      'LEFT SHIFT': UiohookKey.Shift,
      'RIGHT SHIFT': UiohookKey.ShiftRight,
      'F13': UiohookKey.F13,
      'F14': UiohookKey.F14,
      'F15': UiohookKey.F15,
      'F16': UiohookKey.F16,
      'F17': UiohookKey.F17,
      'F18': UiohookKey.F18,
      'F19': UiohookKey.F19,
      'F20': UiohookKey.F20,
      'F21': UiohookKey.F21,
      'F22': UiohookKey.F22,
      'F23': UiohookKey.F23,
      'F24': UiohookKey.F24,
    };
    return keyMap[key] || UiohookKey.MetaRight;
  }

  async init() {
    console.log('[Shortcut] Initializing with key:', this.key, '(keycode:', this.keyCode + ')');

    try {
      // 监听 keydown 事件
      uIOhook.on('keydown', (e) => {
        const isTargetKey = e.keycode === this.keyCode;

        if (isTargetKey || e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
          console.log('[Shortcut] Key down:', e.keycode, 'target:', this.keyCode, 'metaKey:', e.metaKey);
        }

        // 检测按键按下
        if (isTargetKey && !this.isKeyDown) {
          console.log('[Shortcut] Target key pressed:', this.key);
          this.isKeyDown = true;
          this.handleKeyDown();
        }
      });

      // 监听 keyup 事件
      uIOhook.on('keyup', (e) => {
        const isTargetKey = e.keycode === this.keyCode;

        if (isTargetKey || e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
          console.log('[Shortcut] Key up:', e.keycode, 'target:', this.keyCode);
        }

        // 检测按键释放
        if (isTargetKey && this.isKeyDown) {
          console.log('[Shortcut] Target key released:', this.key);
          this.isKeyDown = false;
          this.handleKeyUp();
        }
      });

      // 启动监听
      uIOhook.start();

      console.log('[Shortcut] Listener registered successfully');
    } catch (error) {
      console.error('[Shortcut] Failed to initialize keyboard listener:', error);
      // 抛出错误让上层处理
      throw error;
    }
  }

  async start() {
    return this.init();
  }

  handleKeyDown() {
    // 开始长按计时
    this.pressTimer = setTimeout(() => {
      if (this.isKeyDown && !this.isRecording) {
        this.isRecording = true;
        console.log('[Shortcut] Long press detected!');
        this.emit('longPressStart');
      }
    }, this.longPressDuration);
  }

  handleKeyUp() {
    console.log('[Shortcut] handleKeyUp called, isRecording:', this.isRecording);
    // 清除计时器
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
      console.log('[Shortcut] Timer cleared');
    }

    // 如果正在录音，停止
    if (this.isRecording) {
      this.isRecording = false;
      console.log('[Shortcut] Emitting longPressEnd');
      this.emit('longPressEnd');
    } else {
      console.log('[Shortcut] Not recording, ignoring key up');
    }
  }

  destroy() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    // 停止监听
    try {
      uIOhook.stop();
    } catch (e) {
      console.error('[Shortcut] Error stopping uiohook:', e);
    }
    this.isKeyDown = false;
    this.isRecording = false;
  }

  stop() {
    return this.destroy();
  }
}

module.exports = ShortcutManager;
