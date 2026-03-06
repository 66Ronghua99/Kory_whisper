/**
 * Deps: child_process, http, path
 * Used By: whisper-engine.js
 * Last Updated: 2026-03-06
 *
 * 本地 LLM 后处理器 - 使用 llama-server 后台服务
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

class LocalLLM {
  constructor(options = {}) {
    this.modelPath = options.modelPath || './models/qwen2.5-0.5b-instruct-q3_k_m.gguf';
    this.llamaServerBin = options.llamaServerBin || this.getLlamaServerBinaryPath();
    this.timeoutMs = options.timeoutMs || 3000;
    this.maxTokens = options.maxTokens || 240;
    this.port = options.port || 18080;
    this.server = null;
    this.serverProc = null;
    this.ready = false;
  }

  getLlamaServerBinaryPath() {
    const platform = process.platform;
    if (platform === 'darwin') {
      return '/opt/homebrew/bin/llama-server';
    } else if (platform === 'win32') {
      return path.join(__dirname, '../../bin/llama-server.exe');
    }
    return '/usr/local/bin/llama-server';
  }

  canRun(text) {
    if (!text || !text.trim()) return false;
    const len = text.trim().length;
    if (len < 10) return false;
    if (len > 200) return false;
    return true;
  }

  buildPrompt(text) {
    return [
      '你是语音转写后处理器。',
      '只做以下事情：断句、补标点、术语纠正。',
      '禁止改变原意，禁止增删事实，禁止扩写。',
      '中文场景下优先输出简体中文。',
      '保留英文品牌名和缩写的大小写。',
      '',
      `原始文本：${text}`,
      '',
      '请直接输出修正后的最终文本，不要解释。'
    ].join('\n');
  }

  async startServer() {
    if (this.server && this.ready) return;

    console.log('[LocalLLM] Starting llama-server...');

    const args = [
      '-m', this.modelPath,
      '-c', '2048',
      '-ngl', '1',
      '--port', String(this.port)
    ];

    this.serverProc = spawn(this.llamaServerBin, args);

    this.serverProc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('server is listening') || msg.includes('HTTP server listening')) {
        this.ready = true;
        console.log('[LocalLLM] Server ready on port', this.port);
      }
    });

    this.serverProc.on('error', (error) => {
      console.error('[LocalLLM] Server error:', error.message);
    });

    this.serverProc.on('close', (code) => {
      console.log('[LocalLLM] Server closed:', code);
      this.ready = false;
    });

    // 等待服务器就绪（首次加载模型需要较长时间）
    await this.waitForServer(60000);
  }

  waitForServer(timeoutMs) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const check = () => {
        if (this.ready) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          console.warn('[LocalLLM] Server startup timeout');
          resolve(false);
          return;
        }

        setTimeout(check, 500);
      };

      check();
    });
  }

  stopServer() {
    if (this.serverProc) {
      this.serverProc.kill();
      this.serverProc = null;
      this.ready = false;
      console.log('[LocalLLM] Server stopped');
    }
  }

  httpRequest(options, body) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) req.write(body);
      req.end();
    });
  }

  sanitizeOutput(output) {
    if (!output) return '';
    return String(output)
      .replace(/^```[\w-]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }

  async process(text) {
    if (!this.canRun(text)) {
      return text;
    }

    // 确保服务器运行
    if (!this.ready) {
      await this.startServer();
    }

    const prompt = this.buildPrompt(text);
    const requestBody = {
      prompt,
      n_predict: this.maxTokens,
      temperature: 0.1,
      stream: false
    };

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('[LocalLLM] Timeout, fallback to original');
        resolve(text);
      }, this.timeoutMs);

      const options = {
        hostname: 'localhost',
        port: this.port,
        path: '/v1/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      this.httpRequest(options, JSON.stringify(requestBody))
        .then((data) => {
          clearTimeout(timer);
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.text || json.content || '';
            const sanitized = this.sanitizeOutput(content);

            if (sanitized && sanitized.length > 0) {
              console.log('[LocalLLM] Processed:', sanitized.substring(0, 50));
              resolve(sanitized);
            } else {
              resolve(text);
            }
          } catch {
            resolve(text);
          }
        })
        .catch((error) => {
          clearTimeout(timer);
          console.warn('[LocalLLM] Request error:', error.message);
          resolve(text);
        });
    });
  }
}

module.exports = LocalLLM;
