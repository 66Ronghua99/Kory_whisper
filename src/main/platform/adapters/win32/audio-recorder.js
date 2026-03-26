const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AudioRecorderWin32 {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.channels = options.channels || 1;
    this.device = options.device || null;
    this.explicitFfmpegBinary = options.ffmpegBinary || null;
    this.spawnSync = options.spawnSync || spawnSync;
    this.fileExists = options.fileExists || fs.existsSync;
    this.ffmpegProcess = null;
    this.outputPath = null;
    this.ffmpegBinary = null;
    this.resolvedDevice = null;
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
      if (this.fileExists(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  resolveFfmpegBinary() {
    if (this.explicitFfmpegBinary && this.fileExists(this.explicitFfmpegBinary)) {
      this.ffmpegBinary = this.explicitFfmpegBinary;
      return this.explicitFfmpegBinary;
    }

    if (this.ffmpegBinary && this.fileExists(this.ffmpegBinary)) {
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

  listInputDevices(ffmpegBinary) {
    const result = this.spawnSync(ffmpegBinary, ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], {
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        PATH: this.buildPath()
      }
    });
    const output = [result.stdout || '', result.stderr || ''].join('\n');
    const devices = [];

    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (line.includes('Alternative name')) {
        continue;
      }

      const match = line.match(/"([^"]+)"\s+\((audio)\)/i);
      if (match) {
        devices.push(match[1]);
      }
    }

    return devices;
  }

  choosePreferredDevice(devices = []) {
    const usableDevices = devices.filter((deviceName) => deviceName && deviceName !== 'virtual-audio-capturer');
    if (usableDevices.length === 0) {
      return null;
    }

    const preferred = usableDevices.find((deviceName) => /microphone|mic|array|麦克风/i.test(deviceName));
    return preferred || usableDevices[0];
  }

  resolveInputDevice() {
    if (this.device) {
      return this.device;
    }

    if (this.resolvedDevice) {
      return this.resolvedDevice;
    }

    const ffmpegBinary = this.resolveFfmpegBinary();
    if (!ffmpegBinary) {
      return null;
    }

    const devices = this.listInputDevices(ffmpegBinary);
    this.resolvedDevice = this.choosePreferredDevice(devices);
    return this.resolvedDevice;
  }

  buildFfmpegArgs(deviceName) {
    return [
      '-f', 'dshow',
      '-i', `audio=${deviceName}`,
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
    const inputDevice = this.resolveInputDevice();
    if (!inputDevice) {
      throw new Error('No DirectShow microphone input device is available for Windows recording.');
    }

    return new Promise((resolve, reject) => {
      try {
        const args = this.buildFfmpegArgs(inputDevice);
        const env = {
          ...process.env,
          PATH: this.buildPath()
        };
        let settled = false;
        let stderrBuffer = '';

        this.ffmpegProcess = spawn(ffmpegBinary, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
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

      if (ffmpegProcess.stdin && typeof ffmpegProcess.stdin.write === 'function') {
        ffmpegProcess.stdin.write('q');
      } else {
        ffmpegProcess.kill('SIGTERM');
      }

      const forceKillTimer = setTimeout(() => {
        if (!ffmpegProcess.killed) {
          ffmpegProcess.kill('SIGTERM');
        }
      }, 2000);

      ffmpegProcess.on('close', () => {
        clearTimeout(forceKillTimer);
        if (fs.existsSync(this.outputPath)) {
          resolve(this.outputPath);
          return;
        }

        reject(new Error('Output file not created'));
      });
    });
  }
}

module.exports = AudioRecorderWin32;
