const { exec } = require('child_process');
const { clipboard } = require('electron');
const { deliverTextToClipboard } = require('../../clipboard-output');

class InputInjectorDarwin {
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

  async typeViaAppleScript(text) {
    return new Promise((resolve, reject) => {
      const escaped = this.escapeAppleScript(text);
      const script = `
        tell application "System Events"
          keystroke "${escaped}"
        end tell
      `;

      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to type text: ${error.message}`));
          return;
        }

        resolve({ stdout, stderr });
      });
    });
  }

  escapeAppleScript(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  async pasteText(text) {
    const originalClipboard = clipboard.readText();
    clipboard.writeText(text);

    const script = `
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;

    return new Promise((resolve, reject) => {
      exec(`osascript -e '${script}'`, (error) => {
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

module.exports = InputInjectorDarwin;
