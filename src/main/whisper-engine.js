/**
 * Deps: child_process, fs, path
 * Used By: index.js
 * Last Updated: 2024-03-04
 *
 * Whisper 推理引擎 - 调用 whisper.cpp 进行语音识别
 */

const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class WhisperEngine {
  constructor(options = {}) {
    this.modelPath = options.modelPath || './models/ggml-base.bin';
    this.vocabPath = options.vocabPath;
    this.language = options.language || 'zh';
    this.whisperBin = options.whisperBin || this.getWhisperBinaryPath();
  }

  getWhisperBinaryPath() {
    // 根据平台选择二进制文件
    const platform = process.platform;
    const arch = process.arch;

    if (platform === 'darwin') {
      return path.join(__dirname, '../../bin/whisper-cli');
    } else if (platform === 'win32') {
      return path.join(__dirname, '../../bin/whisper-cli.exe');
    } else {
      return path.join(__dirname, '../../bin/whisper-cli');
    }
  }

  async transcribe(audioPath) {
    console.log('[Whisper] Starting transcription...');
    console.log('[Whisper] Audio file:', audioPath);

    // 加载自定义词表
    let vocabulary = [];
    if (this.vocabPath) {
      try {
        vocabulary = await this.loadVocabulary();
      } catch (error) {
        console.warn('[Whisper] Failed to load vocabulary:', error.message);
      }
    }

    // 构建 prompt
    const prompt = this.buildPrompt(vocabulary);

    // 构建输出文件路径
    const outputPath = audioPath.replace('.wav', '');

    const args = [
      '-m', this.modelPath,
      '-f', audioPath,
      '-l', this.language,
      '-otxt',
      '-of', outputPath,
      '--no-timestamps'
    ];

    // 如果有自定义词表，添加 prompt
    if (prompt) {
      args.push('--prompt', prompt);
    }

    console.log('[Whisper] Command:', this.whisperBin, args.join(' '));

    return new Promise((resolve, reject) => {
      console.log('[Whisper] Executing whisper-cli...');
      const startTime = Date.now();

      execFile(this.whisperBin, args, {
        timeout: 60000, // 60秒超时
        maxBuffer: 1024 * 1024 // 1MB 输出缓冲区
      }, async (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        console.log(`[Whisper] Execution completed in ${duration}ms`);

        if (error) {
          console.error('[Whisper] Process error:', error);
        }
        if (stderr) {
          console.error('[Whisper] stderr:', stderr);
        }
        if (stdout) {
          console.log('[Whisper] stdout:', stdout);
        }

        // 读取输出文件
        const txtPath = `${outputPath}.txt`;
        console.log('[Whisper] Looking for output file:', txtPath);

        try {
          const text = await fs.readFile(txtPath, 'utf-8');
          console.log('[Whisper] Output file read successfully');

          // 清理临时文件
          await this.cleanup(outputPath);

          const result = text.trim();
          console.log('[Whisper] Result:', result);
          resolve(result);

        } catch (readError) {
          console.error('[Whisper] Failed to read output file:', readError.message);
          console.error('[Whisper] Output file path:', txtPath);
          reject(new Error(`Failed to read transcription output: ${readError.message}`));
        }
      });
    });
  }

  buildPrompt(vocabulary) {
    if (!vocabulary || vocabulary.length === 0) {
      return '';
    }

    // 将词表拼接成 prompt
    // Whisper 对 prompt 敏感，可以帮助识别特定词汇
    return vocabulary.join('，') + '。';
  }

  async loadVocabulary() {
    try {
      const data = await fs.readFile(this.vocabPath, 'utf-8');
      const vocab = JSON.parse(data);
      return vocab.words || [];
    } catch (error) {
      console.warn('[Whisper] Failed to load vocabulary file:', error.message);
      return [];
    }
  }

  async cleanup(outputPath) {
    // 清理生成的临时文件
    const extensions = ['.txt', '.wav'];
    for (const ext of extensions) {
      try {
        const filePath = `${outputPath}${ext}`;
        await fs.unlink(filePath);
      } catch {
        // 忽略删除错误
      }
    }
  }
}

module.exports = WhisperEngine;
