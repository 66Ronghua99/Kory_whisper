const { exec } = require('child_process');
const { clipboard } = require('electron');
const { deliverTextToClipboard } = require('../../clipboard-output');

class InputInjectorWin32 {
  constructor(options = {}) {
    this.appendSpace = options.appendSpace !== false;
    this.autoPunctuation = options.autoPunctuation || false;
  }

  async typeText(text) {
    await deliverTextToClipboard(text, {
      appendSpace: this.appendSpace,
      clipboard
    });
  }

  escapePowerShell(text) {
    return text
      .replace(/'/g, "''")
      .replace(/"/g, '`"')
      .replace(/\+/g, '{+}')
      .replace(/^/g, '{^')
      .replace(/$/g, '{$')
      .replace(/%/g, '{%}')
      .replace(/~/g, '{~}')
      .replace(/\(/g, '{(}')
      .replace(/\)/g, '{)}')
      .replace(/\[/g, '{[}')
      .replace(/\]/g, '{]}');
  }

  async pasteText(text) {
    const originalClipboard = clipboard.readText();
    clipboard.writeText(text);

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("^v")
    `;

    return new Promise((resolve, reject) => {
      exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`, (error) => {
        setTimeout(() => {
          clipboard.writeText(originalClipboard);
        }, 100);

        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

module.exports = InputInjectorWin32;
