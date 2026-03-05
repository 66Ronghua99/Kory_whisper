/**
 * Windows input simulator using PowerShell SendKeys
 * Deps: child_process, electron
 * Used By: platform/index.js
 * Last Updated: 2026-03-05
 */

const { exec } = require('child_process');
const { clipboard } = require('electron');

class InputSimulatorWin32 {
  constructor(options = {}) {
    this.appendSpace = options.appendSpace !== false;
    this.autoPunctuation = options.autoPunctuation || false;
  }

  async typeText(text) {
    if (!text || !text.trim()) {
      return;
    }

    let processedText = text.trim();

    if (this.appendSpace && !processedText.endsWith(' ') && !processedText.endsWith('。')) {
      processedText += ' ';
    }

    console.log('[Input] Typing text:', processedText);

    await this.pasteText(processedText);
  }

  escapePowerShell(text) {
    // PowerShell special characters that need escaping for SendKeys
    return text
      .replace(/'/g, "''")  // Single quotes
      .replace(/"/g, '`"') // Double quotes
      .replace(/\+/g, '{+}') // Plus sign
      .replace(/^/g, '{^')  // Caret (not at start)
      .replace(/$/g, '{$')  // Dollar (not at end)
      .replace(/%/g, '{%')  // Percent
      .replace(/~/g, '{~}') // Tilde
      .replace(/\(/g, '{(}') // Parentheses
      .replace(/\)/g, '{)}')
      .replace(/\[/g, '{[}') // Brackets
      .replace(/\]/g, '{]}');
  }

  async pasteText(text) {
    const originalClipboard = clipboard.readText();
    clipboard.writeText(text);

    // Use PowerShell SendKeys for Windows
    const escapedText = this.escapePowerShell(text);
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("^v")
    `;

    return new Promise((resolve, reject) => {
      exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`, (error) => {
        // Restore clipboard after a delay
        setTimeout(() => {
          clipboard.writeText(originalClipboard);
        }, 100);

        if (error) {
          console.error('[Input] SendKeys error:', error);
          reject(error);
        } else {
          console.log('[Input] Text pasted successfully');
          resolve();
        }
      });
    });
  }
}

module.exports = InputSimulatorWin32;
