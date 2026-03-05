/**
 * Deps: child_process, fs, path, os
 * Used By: index.js
 * Last Updated: 2026-03-05
 *
 * 音频录制器 - 使用 sox 直接录制麦克风
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AudioRecorder {
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
      throw new Error('未找到 rec 命令。请安装 sox（brew install sox）后重试。');
    }

    console.log('[Audio] Starting recording with sox...');
    console.log('[Audio] rec binary:', recBinary);
    console.log('[Audio] Output path:', this.outputPath);

    return new Promise((resolve, reject) => {
      try {
        const args = this.buildRecArgs();
        const env = {
          ...process.env,
          PATH: this.buildFinderSafePath()
        };
        let settled = false;
        let stderrBuffer = '';

        console.log('[Audio] Command:', recBinary, args.join(' '));

        this.soxProcess = spawn(recBinary, args, {
          stdio: ['ignore', 'ignore', 'pipe'],
          env
        });

        this.soxProcess.on('error', (error) => {
          this.soxProcess = null;
          console.error('[Audio] Sox process error:', error);
          if (settled) return;
          settled = true;
          const errorMessage = error.code === 'ENOENT'
            ? '未找到 rec 命令，请确认已安装 sox。'
            : `启动录音失败: ${error.message}`;
          reject(new Error(errorMessage));
        });

        this.soxProcess.stderr.on('data', (data) => {
          const msg = data.toString().trim();
          if (!msg) return;
          stderrBuffer += (stderrBuffer ? '\n' : '') + msg;
          if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
            console.error('[Audio] Sox stderr:', msg);
          }
        });

        setTimeout(() => {
          if (settled) return;
          if (this.soxProcess && this.soxProcess.pid && !this.soxProcess.killed) {
            settled = true;
            console.log('[Audio] Recording started with PID:', this.soxProcess.pid);
            resolve();
          } else {
            settled = true;
            this.soxProcess = null;
            const details = stderrBuffer ? ` (${stderrBuffer})` : '';
            reject(new Error(`Failed to start sox process${details}`));
          }
        }, 250);

      } catch (error) {
        console.error('[Audio] Failed to start recording:', error);
        reject(error);
      }
    });
  }

  async stop() {
    console.log('[Audio] Stopping recording...');

    return new Promise((resolve, reject) => {
      if (!this.soxProcess) {
        reject(new Error('Not recording'));
        return;
      }

      const soxProcess = this.soxProcess;
      this.soxProcess = null;

      // 发送 SIGTERM 信号停止录制
      soxProcess.kill('SIGTERM');

      // 等待进程退出
      soxProcess.on('close', (code) => {
        console.log('[Audio] Sox process exited with code:', code);

        // 验证文件是否存在
        if (fs.existsSync(this.outputPath)) {
          const stats = fs.statSync(this.outputPath);
          console.log('[Audio] Recording saved:', this.outputPath, `(${stats.size} bytes)`);
          resolve(this.outputPath);
        } else {
          reject(new Error('Output file not created'));
        }
      });

      // 超时处理
      setTimeout(() => {
        if (!soxProcess.killed) {
          console.warn('[Audio] Force killing sox process...');
          soxProcess.kill('SIGKILL');
        }
      }, 2000);
    });
  }
}

module.exports = AudioRecorder;
