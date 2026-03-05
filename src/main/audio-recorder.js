/**
 * Deps: child_process, fs, path, os
 * Used By: index.js
 * Last Updated: 2024-03-05
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
    this.outputPath = path.join(os.tmpdir(), `kory-whisper-${Date.now()}.wav`);
  }

  async start() {
    console.log('[Audio] Starting recording with sox...');
    console.log('[Audio] Output path:', this.outputPath);

    return new Promise((resolve, reject) => {
      try {
        // 使用 sox 直接录制，确保正确的 WAV 文件头
        // rec -r 16000 -c 1 -b 16 -e signed-integer output.wav
        const args = [
          '-r', this.sampleRate.toString(),
          '-c', this.channels.toString(),
          '-b', '16',
          '-e', 'signed-integer',
          this.outputPath
        ];

        // 如果指定了设备
        if (this.device) {
          args.unshift('-d', this.device);
        }

        console.log('[Audio] Command: rec', args.join(' '));

        this.soxProcess = spawn('rec', args, {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        this.soxProcess.on('error', (error) => {
          console.error('[Audio] Sox process error:', error);
          reject(error);
        });

        this.soxProcess.stderr.on('data', (data) => {
          // sox 会把信息输出到 stderr，忽略非错误信息
          const msg = data.toString();
          if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
            console.error('[Audio] Sox stderr:', msg);
          }
        });

        // 给一点时间确保开始录制
        setTimeout(() => {
          if (this.soxProcess && this.soxProcess.pid) {
            console.log('[Audio] Recording started with PID:', this.soxProcess.pid);
            resolve();
          } else {
            reject(new Error('Failed to start sox process'));
          }
        }, 200);

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

      // 发送 SIGTERM 信号停止录制
      this.soxProcess.kill('SIGTERM');

      // 等待进程退出
      this.soxProcess.on('close', (code) => {
        console.log('[Audio] Sox process exited with code:', code);
        this.soxProcess = null;

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
        if (this.soxProcess) {
          console.warn('[Audio] Force killing sox process...');
          this.soxProcess.kill('SIGKILL');
        }
      }, 2000);
    });
  }
}

module.exports = AudioRecorder;
