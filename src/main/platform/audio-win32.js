/**
 * Windows audio recorder using ffmpeg
 * Deps: child_process, fs, path, os
 * Used By: platform/index.js
 * Last Updated: 2026-03-05
 */

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
      'C:\\Program Files (x86)\\ffmpeg\\bin',
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
    const args = [
      '-f', 'dshow',
      '-i', `audio=${this.device || 'virtual-audio-capturer'}`,
      '-ac', this.channels.toString(),
      '-ar', this.sampleRate.toString(),
      '-acodec', 'pcm_s16le',
      '-y',
      this.outputPath
    ];

    return args;
  }

  async start() {
    if (this.ffmpegProcess) {
      throw new Error('Recording already in progress');
    }

    this.outputPath = path.join(os.tmpdir(), `kory-whisper-${Date.now()}.wav`);
    const ffmpegBinary = this.resolveFfmpegBinary();
    if (!ffmpegBinary) {
      throw new Error('未找到 ffmpeg。请安装 ffmpeg 后重试。');
    }

    console.log('[Audio] Starting recording with ffmpeg...');
    console.log('[Audio] ffmpeg binary:', ffmpegBinary);
    console.log('[Audio] Output path:', this.outputPath);

    return new Promise((resolve, reject) => {
      try {
        const args = this.buildFfmpegArgs();
        const env = {
          ...process.env,
          PATH: this.buildPath()
        };
        let settled = false;
        let stderrBuffer = '';

        console.log('[Audio] Command:', ffmpegBinary, args.join(' '));

        this.ffmpegProcess = spawn(ffmpegBinary, args, {
          stdio: ['ignore', 'ignore', 'pipe'],
          env,
          windowsHide: true
        });

        this.ffmpegProcess.on('error', (error) => {
          this.ffmpegProcess = null;
          console.error('[Audio] FFmpeg process error:', error);
          if (settled) return;
          settled = true;
          const errorMessage = error.code === 'ENOENT'
            ? '未找到 ffmpeg，请确认已安装。'
            : `启动录音失败: ${error.message}`;
          reject(new Error(errorMessage));
        });

        this.ffmpegProcess.stderr.on('data', (data) => {
          const msg = data.toString().trim();
          if (!msg) return;
          stderrBuffer += (stderrBuffer ? '\n' : '') + msg;
          if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
            console.error('[Audio] FFmpeg stderr:', msg);
          }
        });

        setTimeout(() => {
          if (settled) return;
          if (this.ffmpegProcess && this.ffmpegProcess.pid && !this.ffmpegProcess.killed) {
            settled = true;
            console.log('[Audio] Recording started with PID:', this.ffmpegProcess.pid);
            resolve();
          } else {
            settled = true;
            this.ffmpegProcess = null;
            const details = stderrBuffer ? ` (${stderrBuffer})` : '';
            reject(new Error(`Failed to start ffmpeg process${details}`));
          }
        }, 500);

      } catch (error) {
        console.error('[Audio] Failed to start recording:', error);
        reject(error);
      }
    });
  }

  async stop() {
    console.log('[Audio] Stopping recording...');

    return new Promise((resolve, reject) => {
      if (!this.ffmpegProcess) {
        reject(new Error('Not recording'));
        return;
      }

      const ffmpegProcess = this.ffmpegProcess;
      this.ffmpegProcess = null;

      // Send 'q' to gracefully stop ffmpeg
      ffmpegProcess.stdin.write('q');

      // Wait for process to exit
      ffmpegProcess.on('close', (code) => {
        console.log('[Audio] FFmpeg process exited with code:', code);

        if (fs.existsSync(this.outputPath)) {
          const stats = fs.statSync(this.outputPath);
          console.log('[Audio] Recording saved:', this.outputPath, `(${stats.size} bytes)`);
          resolve(this.outputPath);
        } else {
          reject(new Error('Output file not created'));
        }
      });

      // Timeout handling
      setTimeout(() => {
        if (!ffmpegProcess.killed) {
          console.warn('[Audio] Force killing ffmpeg process...');
          ffmpegProcess.kill('SIGTERM');
        }
      }, 2000);
    });
  }
}

module.exports = AudioRecorderWin32;
