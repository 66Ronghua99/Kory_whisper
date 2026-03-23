/**
 * Deps: child_process
 * Used By: index.js
 * Last Updated: 2024-03-04
 *
 * 输入模拟器 - 使用 AppleScript 模拟键盘输入
 */

const { exec } = require('child_process');

class InputSimulator {
  constructor(options = {}) {
    this.appendSpace = options.appendSpace !== false;
    this.autoPunctuation = options.autoPunctuation || false;
  }

  async typeText(text) {
    if (!text || !text.trim()) {
      return;
    }

    let processedText = text.trim();

    // 自动添加空格（可选）
    if (this.appendSpace && !processedText.endsWith(' ') && !processedText.endsWith('。')) {
      processedText += ' ';
    }

    console.log('[Input] Typing text:', processedText);

    // 使用剪贴板粘贴方式，避免中文输入法干扰
    await this.pasteText(processedText);
  }

  async typeViaAppleScript(text) {
    return new Promise((resolve, reject) => {
      // 转义 AppleScript 特殊字符
      const escaped = this.escapeAppleScript(text);

      const script = `
        tell application "System Events"
          keystroke "${escaped}"
        end tell
      `;

      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
          console.error('[Input] AppleScript error:', error);
          console.error('[Input] stderr:', stderr);
          reject(new Error(`Failed to type text: ${error.message}`));
          return;
        }

        console.log('[Input] Text typed successfully');
        resolve();
      });
    });
  }

  escapeAppleScript(text) {
    // AppleScript 字符串转义
    return text
      .replace(/\\/g, '\\\\')      // 反斜杠
      .replace(/"/g, '\\"')        // 双引号
      .replace(/\n/g, '\\n')       // 换行
      .replace(/\r/g, '\\r')       // 回车
      .replace(/\t/g, '\\t');      // 制表符
  }

  async pasteText(text) {
    // 备选方案：复制到剪贴板然后粘贴
    const { clipboard } = require('electron');

    const originalClipboard = clipboard.readText();
    clipboard.writeText(text);

    // 模拟 Cmd+V
    const script = `
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;

    return new Promise((resolve, reject) => {
      exec(`osascript -e '${script}'`, (error) => {
        // 恢复原始剪贴板
        setTimeout(() => {
          clipboard.writeText(originalClipboard);
        }, 100);

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = InputSimulator;
