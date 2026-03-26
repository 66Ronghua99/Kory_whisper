/**
 * Deps: fs, https, path, events
 * Used By: index.js
 * Last Updated: 2026-03-26
 *
 * Model downloader for Whisper model files.
 */

const fs = require('fs').promises;
const nodeFs = require('fs');
const https = require('https');
const path = require('path');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { EventEmitter } = require('events');

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

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
    const tempPath = `${modelPath}.download`;
    const url = `${this.modelUrl}/${modelName}`;

    await fs.mkdir(this.modelsDir, { recursive: true });
    await this.cleanupFile(tempPath);

    try {
      await this.downloadToTempFile(url, tempPath, modelName, onProgress);
      await this.cleanupFile(modelPath);
      await fs.rename(tempPath, modelPath);
      return modelPath;
    } catch (error) {
      await this.cleanupFile(tempPath);
      throw error;
    }
  }

  async seedModelFromPath(sourcePath, modelName = 'ggml-base.bin') {
    if (!sourcePath) {
      return { copied: false, path: null };
    }

    const targetPath = path.join(this.modelsDir, modelName);

    try {
      await fs.access(sourcePath);
    } catch {
      return { copied: false, path: targetPath };
    }

    await fs.mkdir(this.modelsDir, { recursive: true });
    await fs.copyFile(sourcePath, targetPath);

    return {
      copied: true,
      path: targetPath,
      size: (await fs.stat(targetPath)).size
    };
  }

  async downloadToTempFile(url, tempPath, modelName, onProgress, redirectCount = 0) {
    if (redirectCount > MAX_REDIRECTS) {
      throw new Error(`Too many redirects while downloading ${modelName}`);
    }

    const response = await this.request(url);

    if (REDIRECT_STATUS_CODES.has(response.statusCode) && response.headers.location) {
      response.resume();
      return this.downloadToTempFile(
        response.headers.location,
        tempPath,
        modelName,
        onProgress,
        redirectCount + 1
      );
    }

    if (response.statusCode !== 200) {
      response.resume();
      throw new Error(`Unexpected response status ${response.statusCode} while downloading ${modelName}`);
    }

    const parsedTotalBytes = parseInt(response.headers['content-length'], 10);
    const totalBytes = Number.isFinite(parsedTotalBytes) ? parsedTotalBytes : null;
    let downloadedBytes = 0;
    const progressTracker = new Transform({
      transform(chunk, encoding, callback) {
        downloadedBytes += chunk.length;
        if (onProgress) {
          const progress = totalBytes
            ? (downloadedBytes / totalBytes * 100).toFixed(1)
            : null;
          onProgress({
            percent: progress,
            downloadedBytes,
            totalBytes
          });
        }
        callback(null, chunk);
      }
    });

    await pipeline(response, progressTracker, nodeFs.createWriteStream(tempPath));

    if (totalBytes && downloadedBytes !== totalBytes) {
      throw new Error(`Incomplete download for ${modelName}: expected ${totalBytes} bytes, received ${downloadedBytes}`);
    }

    if (downloadedBytes <= 0) {
      throw new Error(`Incomplete download for ${modelName}: received 0 bytes`);
    }
  }

  request(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        resolve(response);
      }).on('error', reject);
    });
  }

  async cleanupFile(filePath) {
    if (!filePath) {
      return;
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getModelInfo(modelName) {
    const models = {
      'ggml-tiny.bin': { size: '39 MB', desc: 'Fastest, with lower accuracy.' },
      'ggml-base.bin': { size: '141 MB', desc: 'Recommended speed and accuracy balance.' },
      'ggml-small.bin': { size: '466 MB', desc: 'Higher accuracy with slower speed.' },
      'ggml-medium.bin': { size: '769 MB', desc: 'High accuracy with slower speed.' },
      'ggml-large.bin': { size: '1.5 GB', desc: 'Highest accuracy with the slowest speed.' }
    };
    return models[modelName] || { size: 'Unknown', desc: '' };
  }
}

module.exports = ModelDownloader;
