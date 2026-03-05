/**
 * Deps: fs, https, path, events
 * Used By: index.js
 * Last Updated: 2024-03-04
 *
 * 模型下载器 - 自动下载 Whisper 模型文件
 */

const fs = require('fs').promises;
const https = require('https');
const path = require('path');
const { EventEmitter } = require('events');

class ModelDownloader extends EventEmitter {
  constructor(options = {}) {
    super();
    this.modelsDir = options.modelsDir || path.join(__dirname, '../../models');
    this.modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';
  }

  async checkModel(modelName = 'ggml-base.bin') {
    const modelPath = path.join(this.modelsDir, modelName);
    try {
      await fs.access(modelPath);
      return { exists: true, path: modelPath, size: (await fs.stat(modelPath)).size };
    } catch {
      return { exists: false, path: modelPath };
    }
  }

  async downloadModel(modelName = 'ggml-base.bin', onProgress = null) {
    const modelPath = path.join(this.modelsDir, modelName);
    const url = `${this.modelUrl}/${modelName}`;

    await fs.mkdir(this.modelsDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(modelPath);
      let downloadedBytes = 0;
      let totalBytes = 0;

      https.get(url, { redirect: true }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // 跟随重定向
          https.get(response.headers.location, (redirectResponse) => {
            this.handleDownload(redirectResponse, file, modelPath, onProgress, resolve, reject);
          }).on('error', reject);
        } else {
          this.handleDownload(response, file, modelPath, onProgress, resolve, reject);
        }
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  handleDownload(response, file, modelPath, onProgress, resolve, reject) {
    const totalBytes = parseInt(response.headers['content-length'], 10);
    let downloadedBytes = 0;

    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (onProgress && totalBytes) {
        const progress = (downloadedBytes / totalBytes * 100).toFixed(1);
        onProgress(progress, downloadedBytes, totalBytes);
      }
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      resolve(modelPath);
    });

    file.on('error', (error) => {
      fs.unlink(modelPath).catch(() => {});
      reject(error);
    });
  }

  getModelInfo(modelName) {
    const models = {
      'ggml-tiny.bin': { size: '39 MB', desc: '速度最快，精度较低' },
      'ggml-base.bin': { size: '74 MB', desc: '推荐，速度与精度平衡' },
      'ggml-small.bin': { size: '244 MB', desc: '精度更高，速度较慢' },
      'ggml-medium.bin': { size: '769 MB', desc: '高精度，速度较慢' },
      'ggml-large.bin': { size: '1.5 GB', desc: '最高精度，速度最慢' }
    };
    return models[modelName] || { size: '未知', desc: '' };
  }
}

module.exports = ModelDownloader;
