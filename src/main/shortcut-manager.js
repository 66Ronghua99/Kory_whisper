/**
 * Deps: node-global-key-listener
 * Used By: index.js
 * Last Updated: 2026-03-05
 *
 * 全局快捷键管理器 - 处理长按检测
 * 支持: LEFT/RIGHT COMMAND, OPTION, CONTROL, F13-F15, Fn 等
 */

const { GlobalKeyboardListener } = require('node-global-key-listener');
const { EventEmitter } = require('events');

class ShortcutManager extends EventEmitter {
  constructor(options = {}) {
    super();
    // 默认使用右 Command 键 (所有 Mac 都有)
    this.key = options.key || 'RIGHT COMMAND';
    // node-global-key-listener 使用 META 而不是 COMMAND
    this.eventKey = this.mapKeyToEventName(this.key);
    this.longPressDuration = options.longPressDuration || options.duration || 500;
    this.onInfo = options.onInfo || null;
    this.onError = options.onError || null;
    this.keyboard = null;  // 延迟初始化，避免权限问题导致卡死
    this.listener = null;
    this.pressTimer = null;
    this.isRecording = false;
    this.isKeyDown = false;
  }

  // 将配置键名映射到事件名
  mapKeyToEventName(key) {
    // node-global-key-listener 在 macOS 上使用 META 表示 Command 键
    return key.replace('COMMAND', 'META');
  }

  async init() {
    console.log('[Shortcut] Initializing with key:', this.key, '(event:', this.eventKey + ')');

    try {
      // 延迟初始化，避免在构造函数中就尝试获取权限
      this.keyboard = new GlobalKeyboardListener({
        mac: {
          onError: (errorCode) => {
            console.error('[Shortcut] MacKeyServer closed with code:', errorCode);
            if (this.onError) {
              this.onError(errorCode);
            }
          },
          onInfo: (info) => {
            const message = String(info || '').trim();
            if (!message) return;
            console.log('[Shortcut][MacKeyServer]', message);
            if (this.onInfo) {
              this.onInfo(message);
            }
          }
        }
      });

      this.listener = (event, down) => {
        const eventName = event?.name || '';
        // 调试：记录所有按键事件（用于诊断）
        const isTargetKey = eventName === this.eventKey;
        if (isTargetKey || eventName.includes('COMMAND') || eventName.includes('META')) {
          console.log('[Shortcut] Raw event:', eventName, 'state:', event.state, 'down:', JSON.stringify(down));
        }

        const isPressed = down[this.eventKey] === true;

        // 检测按键按下
        if (isTargetKey && isPressed && !this.isKeyDown) {
          console.log('[Shortcut] Target key pressed:', this.key);
          this.isKeyDown = true;
          this.handleKeyDown();
        }

        // 检测按键释放
        if (isTargetKey && !isPressed && this.isKeyDown) {
          console.log('[Shortcut] Target key released:', this.key);
          this.isKeyDown = false;
          this.handleKeyUp();
        }

        // 不要返回 true，让事件继续传播，避免键盘卡死
        return false;
      };

      await this.keyboard.addListener(this.listener);

      console.log('[Shortcut] Listener registered successfully');
    } catch (error) {
      console.error('[Shortcut] Failed to initialize keyboard listener:', error);
      // 抛出错误让上层处理
      throw error;
    }
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
    // 正确清理监听器
    if (this.keyboard) {
      if (this.listener) {
        this.keyboard.removeListener(this.listener);
        this.listener = null;
      }
      this.keyboard.kill();
      this.keyboard = null;
    }
    this.isKeyDown = false;
    this.isRecording = false;
  }
}

module.exports = ShortcutManager;
