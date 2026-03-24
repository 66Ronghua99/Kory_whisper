const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AudioRecorderDarwin {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.channels = options.channels || 1;
    this.device = options.device || null;
    this.soxProcess = null;
    this.outputPath = null;
    this.recBinary = null;
  }

  buildFinderSafePath() {
    const defaults = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin'
    ];
    const pathParts = String(process.env.PATH || '').split(':').filter(Boolean);
    return [...new Set([...pathParts, ...defaults])].join(':');
  }

  findInPath(binaryName, pathValue) {
    const pathParts = String(pathValue || '').split(':').filter(Boolean);
    for (const dir of pathParts) {
      const fullPath = path.join(dir, binaryName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  resolveRecBinary() {
    if (this.recBinary && fs.existsSync(this.recBinary)) {
      return this.recBinary;
    }

    const finderSafePath = this.buildFinderSafePath();
    const fromPath = this.findInPath('rec', finderSafePath);
    if (fromPath) {
      this.recBinary = fromPath;
      return fromPath;
    }

    const candidates = ['/opt/homebrew/bin/rec', '/usr/local/bin/rec', '/usr/bin/rec'];
    const directMatch = candidates.find((candidate) => fs.existsSync(candidate));
    if (directMatch) {
      this.recBinary = directMatch;
      return directMatch;
    }

    return null;
  }

  buildRecArgs() {
    const args = [
      '-r', this.sampleRate.toString(),
      '-c', this.channels.toString(),
      '-b', '16',
      '-e', 'signed-integer',
      this.outputPath
    ];

    if (this.device) {
      args.unshift('-d', this.device);
    }

    return args;
  }

  async start() {
    if (this.soxProcess) {
      throw new Error('Recording already in progress');
    }

    this.outputPath = path.join(os.tmpdir(), `kory-whisper-${Date.now()}.wav`);
    const recBinary = this.resolveRecBinary();
    if (!recBinary) {
      throw new Error('rec command not found. Install sox and try again.');
    }

    return new Promise((resolve, reject) => {
      try {
        const args = this.buildRecArgs();
        const env = {
          ...process.env,
          PATH: this.buildFinderSafePath()
        };
        let settled = false;
        let stderrBuffer = '';

        this.soxProcess = spawn(recBinary, args, {
          stdio: ['ignore', 'ignore', 'pipe'],
          env
        });

        this.soxProcess.on('error', (error) => {
          this.soxProcess = null;
          if (settled) {
            return;
          }

          settled = true;
          const errorMessage = error.code === 'ENOENT'
            ? 'rec command not found. Install sox and try again.'
            : `Failed to start recording: ${error.message}`;
          reject(new Error(errorMessage));
        });

        this.soxProcess.stderr.on('data', (data) => {
          const message = data.toString().trim();
          if (!message) {
            return;
          }

          stderrBuffer += (stderrBuffer ? '\n' : '') + message;
        });

        setTimeout(() => {
          if (settled) {
            return;
          }

          if (this.soxProcess && this.soxProcess.pid && !this.soxProcess.killed) {
            settled = true;
            resolve();
            return;
          }

          settled = true;
          this.soxProcess = null;
          const details = stderrBuffer ? ` (${stderrBuffer})` : '';
          reject(new Error(`Failed to start sox process${details}`));
        }, 250);
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.soxProcess) {
        reject(new Error('Not recording'));
        return;
      }

      const soxProcess = this.soxProcess;
      this.soxProcess = null;

      soxProcess.kill('SIGTERM');

      soxProcess.on('close', () => {
        if (fs.existsSync(this.outputPath)) {
          resolve(this.outputPath);
          return;
        }

        reject(new Error('Output file not created'));
      });

      setTimeout(() => {
        if (!soxProcess.killed) {
          soxProcess.kill('SIGKILL');
        }
      }, 2000);
    });
  }
}

module.exports = AudioRecorderDarwin;
