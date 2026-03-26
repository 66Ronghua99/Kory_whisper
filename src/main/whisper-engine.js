/**
 * Deps: child_process, fs, path
 * Used By: src/main/services/transcription-service.js
 * Last Updated: 2026-03-24
 *
 * Whisper execution engine. It owns whisper-cli invocation and debug capture persistence,
 * while post-processing stays outside this module.
 */

const { execFile } = require('child_process');
const fs = require('fs').promises;

class WhisperEngine {
  constructor(options = {}) {
    this.modelPath = options.modelPath || './models/ggml-base.bin';
    this.language = options.language || 'zh';
    this.prompt = options.prompt || '';
    this.whisperBin = options.whisperBin || '';
    this.debugCaptureStore = options.debugCaptureStore || null;
  }

  async transcribe(audioPath, options = {}) {
    console.log('[Whisper] Starting transcription...');
    console.log('[Whisper] Audio file:', audioPath);

    const prompt = this.buildPrompt();
    const outputPath = audioPath.replace('.wav', '');

    const args = [
      '-m', this.modelPath,
      '-f', audioPath,
      '-l', this.language,
      '-otxt',
      '-of', outputPath,
      '--no-timestamps'
    ];

    if (prompt) {
      args.push('--prompt', prompt);
    }

    console.log('[Whisper] Command:', this.whisperBin, args.join(' '));

    return new Promise((resolve, reject) => {
      console.log('[Whisper] Executing whisper-cli...');
      const startTime = Date.now();

      execFile(this.whisperBin, args, {
        timeout: 10 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024
      }, async (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        console.log(`[Whisper] Execution completed in ${duration}ms`);
        const stdoutSummary = this.summarizeCaptureText(stdout);
        const stderrSummary = this.summarizeCaptureText(stderr);
        const captureBase = {
          timestamp: new Date(),
          audioPath,
          rawTextPath: null,
          meta: {
            prompt,
            args: [...args],
            stdoutSummary,
            stderrSummary,
            stdoutCharCount: typeof stdout === 'string' ? stdout.length : 0,
            stderrCharCount: typeof stderr === 'string' ? stderr.length : 0,
            finalText: null,
            errorMessage: null
          }
        };

        if (error) {
          console.error('[Whisper] Process error:', error);
          if (stderr) {
            console.error('[Whisper] stderr:', stderr);
          }
          const detail = stderr ? ` (${String(stderr).trim()})` : '';
          captureBase.meta.errorMessage = `Whisper transcription failed: ${error.message}${detail}`;
          captureBase.rawTextPath = await this.findRawTextPath(outputPath);
          await this.persistDebugCapture(captureBase);
          try {
            await this.cleanup(outputPath);
          } catch {
            // Keep the original execution error as the primary failure.
          }
          reject(new Error(captureBase.meta.errorMessage));
          return;
        }
        if (stderr) {
          console.error('[Whisper] stderr:', stderr);
        }
        if (stdout) {
          console.log('[Whisper] stdout:', stdout);
        }

        const txtPath = `${outputPath}.txt`;
        console.log('[Whisper] Looking for output file:', txtPath);

        try {
          const text = await fs.readFile(txtPath, 'utf-8');
          console.log('[Whisper] Output file read successfully');

          const result = text.trim();
          captureBase.rawTextPath = txtPath;
          captureBase.meta.finalText = result;
          await this.persistDebugCapture(captureBase);

          await this.cleanup(outputPath);
          console.log('[Whisper] Result:', result);
          resolve(result);
        } catch (readError) {
          console.error('[Whisper] Failed to read output file:', readError.message);
          console.error('[Whisper] Output file path:', txtPath);
          captureBase.meta.errorMessage = `Failed to read transcription output: ${readError.message}`;
          captureBase.rawTextPath = await this.findRawTextPath(outputPath);
          await this.persistDebugCapture(captureBase);
          try {
            await this.cleanup(outputPath);
          } catch {
            // Keep the original read error as the primary failure.
          }
          reject(new Error(`Failed to read transcription output: ${readError.message}`));
        }
      });
    });
  }

  updateRuntimeOptions(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'modelPath')) {
      this.modelPath = options.modelPath;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'language')) {
      this.language = options.language || 'zh';
    }
    if (Object.prototype.hasOwnProperty.call(options, 'prompt')) {
      this.prompt = options.prompt || '';
    }
  }

  async stop() {
    if (this.localLLM && typeof this.localLLM.stopServer === 'function') {
      await this.localLLM.stopServer();
    }
  }

  buildPrompt() {
    if (!this.prompt || !this.prompt.trim()) {
      return '';
    }

    return `${this.prompt.trim()}。`;
  }

  async cleanup(outputPath) {
    const extensions = ['.txt', '.wav'];
    for (const ext of extensions) {
      try {
        const filePath = `${outputPath}${ext}`;
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup failures because the transcription result already won or failed.
      }
    }
  }

  async findRawTextPath(outputPath) {
    const txtPath = `${outputPath}.txt`;
    try {
      await fs.access(txtPath);
      return txtPath;
    } catch {
      return null;
    }
  }

  summarizeCaptureText(text) {
    if (typeof text !== 'string') {
      return '';
    }

    return text.length > 4096 ? text.slice(0, 4096) : text;
  }

  async persistDebugCapture(captureInput) {
    if (!this.debugCaptureStore || typeof this.debugCaptureStore.persist !== 'function') {
      return null;
    }

    try {
      return await this.debugCaptureStore.persist(captureInput);
    } catch (error) {
      console.warn('[Whisper] Failed to persist debug capture:', error.message);
      return null;
    }
  }
}

module.exports = WhisperEngine;
