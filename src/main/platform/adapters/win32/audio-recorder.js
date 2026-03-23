const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AudioRecorderWin32 {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.channels = options.channels || 1;
    this.device = options.device || null;
    this.ffmpegProcess = null;
    this.outputPath = null;
    this.ffmpegBinary = null;
  }

  buildPath() {
    const defaults = [
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'ffmpeg', 'bin') : null,
      'C:\\ffmpeg\\bin',
      'C:\\Program Files\\ffmpeg\\bin',
      'C:\\Program Files (x86)\\ffmpeg\\bin'
    ].filter(Boolean);

    const pathValue = process.env.PATH || '';
    const pathParts = pathValue.split(';').filter(Boolean);
    return [...new Set([...pathParts, ...defaults])].join(';');
  }

  findInPath(binaryName, pathValue) {
    const pathParts = pathValue.split(';').filter(Boolean);
    for (const dir of pathParts) {
      const fullPath = path.join(dir, binaryName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  resolveFfmpegBinary() {
    if (this.ffmpegBinary && fs.existsSync(this.ffmpegBinary)) {
      return this.ffmpegBinary;
    }

    const customPath = this.buildPath();
    const fromPath = this.findInPath('ffmpeg.exe', customPath);
    if (fromPath) {
      this.ffmpegBinary = fromPath;
      return fromPath;
    }

    return null;
  }

  buildFfmpegArgs() {
    return [
      '-f', 'dshow',
      '-i', `audio=${this.device || 'virtual-audio-capturer'}`,
      '-ac', this.channels.toString(),
      '-ar', this.sampleRate.toString(),
      '-acodec', 'pcm_s16le',
      '-y',
      this.outputPath
    ];
  }

  async start() {
    if (this.ffmpegProcess) {
      throw new Error('Recording already in progress');
    }

    this.outputPath = path.join(os.tmpdir(), `kory-whisper-${Date.now()}.wav`);
    const ffmpegBinary = this.resolveFfmpegBinary();
    if (!ffmpegBinary) {
      throw new Error('ffmpeg not found. Install ffmpeg and try again.');
    }

    return new Promise((resolve, reject) => {
      try {
        const args = this.buildFfmpegArgs();
        const env = {
          ...process.env,
          PATH: this.buildPath()
        };
        let settled = false;
        let stderrBuffer = '';

        this.ffmpegProcess = spawn(ffmpegBinary, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env,
          windowsHide: true
        });

        this.ffmpegProcess.on('error', (error) => {
          this.ffmpegProcess = null;
          if (settled) {
            return;
          }

          settled = true;
          const errorMessage = error.code === 'ENOENT'
            ? 'ffmpeg not found. Install ffmpeg and try again.'
            : `Failed to start recording: ${error.message}`;
          reject(new Error(errorMessage));
        });

        this.ffmpegProcess.stderr.on('data', (data) => {
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

          if (this.ffmpegProcess && this.ffmpegProcess.pid && !this.ffmpegProcess.killed) {
            settled = true;
            resolve();
            return;
          }

          settled = true;
          this.ffmpegProcess = null;
          const details = stderrBuffer ? ` (${stderrBuffer})` : '';
          reject(new Error(`Failed to start ffmpeg process${details}`));
        }, 500);
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.ffmpegProcess) {
        reject(new Error('Not recording'));
        return;
      }

      const ffmpegProcess = this.ffmpegProcess;
      this.ffmpegProcess = null;

      ffmpegProcess.stdin.write('q');

      ffmpegProcess.on('close', () => {
        if (fs.existsSync(this.outputPath)) {
          resolve(this.outputPath);
          return;
        }

        reject(new Error('Output file not created'));
      });

      setTimeout(() => {
        if (!ffmpegProcess.killed) {
          ffmpegProcess.kill('SIGTERM');
        }
      }, 2000);
    });
  }
}

module.exports = AudioRecorderWin32;
