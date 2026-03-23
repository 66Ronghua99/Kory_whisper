/**
 * Deps: child_process, fs, path, opencc-js
 * Used By: index.js
 * Last Updated: 2026-03-07
 *
 * Whisper 推理引擎 - 调用 whisper.cpp 进行语音识别
 * 注意：LLM 后处理已独立为单独模块 (llm-postprocessor.js / local-llm.js)
 */

const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const OpenCC = require('opencc-js');

class WhisperEngine {
  constructor(options = {}) {
    this.modelPath = options.modelPath || './models/ggml-base.bin';
    this.vocabPath = options.vocabPath;
    this.language = options.language || 'zh';
    this.prompt = options.prompt || '';
    this.outputScript = options.outputScript || 'simplified';
    this.enablePunctuation = options.enablePunctuation !== false;
    this.whisperBin = options.whisperBin || this.getWhisperBinaryPath();
    this.debugCaptureStore = options.debugCaptureStore || null;
    this.toSimplified = this.createSimplifiedConverter();
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
    let vocabularyData = { words: [], replacements: {} };
    if (this.vocabPath) {
      try {
        vocabularyData = await this.loadVocabularyData();
      } catch (error) {
        console.warn('[Whisper] Failed to load vocabulary:', error.message);
      }
    }

    // 构建 prompt
    const prompt = this.buildPrompt(vocabularyData.words);

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
        timeout: 10 * 60 * 1000, // 长录音在 small/medium 模型上需要更宽松的转写窗口
        maxBuffer: 10 * 1024 * 1024 // 避免较长转写输出触发 execFile 缓冲区上限
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
            // 保持原始错误为主
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

        // 读取输出文件
        const txtPath = `${outputPath}.txt`;
        console.log('[Whisper] Looking for output file:', txtPath);

        try {
          const text = await fs.readFile(txtPath, 'utf-8');
          console.log('[Whisper] Output file read successfully');

          const result = await this.postProcessText(text.trim(), vocabularyData);
          captureBase.rawTextPath = txtPath;
          captureBase.meta.finalText = result;
          await this.persistDebugCapture(captureBase);

          // 清理临时文件
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
            // 保持原始错误为主
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
    if (Object.prototype.hasOwnProperty.call(options, 'vocabPath')) {
      this.vocabPath = options.vocabPath;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'language')) {
      this.language = options.language || 'zh';
    }
    if (Object.prototype.hasOwnProperty.call(options, 'prompt')) {
      this.prompt = options.prompt || '';
    }
    if (Object.prototype.hasOwnProperty.call(options, 'outputScript')) {
      this.outputScript = options.outputScript || 'simplified';
    }
    if (Object.prototype.hasOwnProperty.call(options, 'enablePunctuation')) {
      this.enablePunctuation = options.enablePunctuation !== false;
    }
  }

  async stop() {
    if (this.localLLM && typeof this.localLLM.stopServer === 'function') {
      await this.localLLM.stopServer();
    }
  }

  buildPrompt(vocabulary) {
    const promptParts = [];

    if (this.prompt && this.prompt.trim()) {
      promptParts.push(this.prompt.trim());
    }

    if (this.shouldUseSimplifiedChinese()) {
      promptParts.push('请使用简体中文输出');
    }

    if (vocabulary && vocabulary.length > 0) {
      // Whisper 对 prompt 敏感，可以帮助识别特定词汇
      promptParts.push(vocabulary.join('，'));
    }

    if (promptParts.length === 0) {
      return '';
    }

    return promptParts.join('。') + '。';
  }

  async loadVocabularyData() {
    try {
      const data = await fs.readFile(this.vocabPath, 'utf-8');
      const vocab = JSON.parse(data);
      const words = Array.isArray(vocab.words)
        ? vocab.words.map(w => String(w || '').trim()).filter(Boolean)
        : [];
      const replacements = this.normalizeReplacements(vocab.replacements);
      return { words, replacements };
    } catch (error) {
      console.warn('[Whisper] Failed to load vocabulary file:', error.message);
      return { words: [], replacements: {} };
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

  createSimplifiedConverter() {
    try {
      const twToCn = OpenCC.Converter({ from: 'twp', to: 'cn' });
      const hkToCn = OpenCC.Converter({ from: 'hk', to: 'cn' });
      return (text) => hkToCn(twToCn(text));
    } catch (error) {
      console.warn('[Whisper] Failed to initialize OpenCC converter:', error.message);
      return null;
    }
  }

  shouldUseSimplifiedChinese() {
    if (this.outputScript !== 'simplified') return false;
    return this.language === 'zh' || this.language === 'auto';
  }

  shouldUseChinesePunctuation() {
    if (!this.enablePunctuation) return false;
    return this.language === 'zh' || this.language === 'auto';
  }

  async postProcessText(text, vocabularyData = { words: [], replacements: {} }) {
    if (!text) return text;
    let result = text;

    if (this.shouldUseSimplifiedChinese() && this.toSimplified) {
      try {
        result = this.toSimplified(result);
      } catch (error) {
        console.warn('[Whisper] Failed to convert text to simplified Chinese:', error.message);
      }
    }

    try {
      result = this.applyVocabularyCorrections(result, vocabularyData);
    } catch (error) {
      console.warn('[Whisper] Failed to apply vocabulary corrections:', error.message);
    }

    // 标点处理
    if (this.shouldUseChinesePunctuation()) {
      result = this.applyChinesePunctuation(result);
    }

    return result.trim();
  }

  normalizeReplacements(replacements) {
    if (!replacements) return {};
    if (Array.isArray(replacements)) {
      const mapped = {};
      for (const item of replacements) {
        if (Array.isArray(item) && item.length >= 2) {
          mapped[String(item[0]).trim()] = String(item[1]).trim();
          continue;
        }
        if (item && typeof item === 'object' && item.from && item.to) {
          mapped[String(item.from).trim()] = String(item.to).trim();
          continue;
        }
        if (typeof item === 'string' && item.includes('=>')) {
          const [from, to] = item.split('=>').map(v => v.trim());
          if (from && to) mapped[from] = to;
        }
      }
      return mapped;
    }

    if (typeof replacements === 'object') {
      return Object.fromEntries(
        Object.entries(replacements)
          .map(([from, to]) => [String(from).trim(), String(to).trim()])
          .filter(([from, to]) => from && to)
      );
    }

    return {};
  }

  applyVocabularyCorrections(text, vocabularyData) {
    const entries = [];
    const replacements = vocabularyData?.replacements || {};
    for (const [from, to] of Object.entries(replacements)) {
      entries.push({ from, to });
    }

    // 默认补充少量易错专有词（仅在词表包含目标词时生效）
    const canonicalWords = new Set((vocabularyData?.words || []).map(w => w.toLowerCase()));
    if (canonicalWords.has('gemini') && !replacements.JMI && !replacements.jmi) {
      entries.push({ from: 'JMI', to: 'Gemini' });
      entries.push({ from: 'J M I', to: 'Gemini' });
    }
    if (canonicalWords.has('minimax') && !replacements['mini max']) {
      entries.push({ from: 'mini max', to: 'MiniMax' });
    }

    let result = text;
    const sortedEntries = entries.sort((a, b) => b.from.length - a.from.length);
    for (const { from, to } of sortedEntries) {
      const pattern = this.buildReplacementRegex(from);
      result = result.replace(pattern, to);
    }

    return result;
  }

  buildReplacementRegex(source) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const asciiToken = /^[A-Za-z0-9][A-Za-z0-9 &._+-]*$/.test(source);
    if (asciiToken) {
      return new RegExp(`\\b${escaped}\\b`, 'gi');
    }
    return new RegExp(escaped, 'g');
  }

  applyChinesePunctuation(text) {
    let result = text;
    result = result.replace(/,/g, '，').replace(/;/g, '；');
    result = result.replace(/\?/g, '？').replace(/!/g, '！').replace(/:/g, '：');
    result = result.replace(/([\u4E00-\u9FFF])\s+([\u4E00-\u9FFF])/g, '$1$2');
    result = result.replace(/\s+/g, ' ');

    result = this.insertConnectorCommas(result);
    result = this.splitLongChineseSegments(result, 40);

    if (/[A-Za-z0-9\u4E00-\u9FFF]$/.test(result) && !/[。！？]$/.test(result)) {
      result += '。';
    }

    return result;
  }

  insertConnectorCommas(text) {
    const connectors = ['但是', '然后', '所以', '因为', '如果', '不过', '并且', '而且', '另外', '同时', '比如', '例如', '还有'];
    let result = text;
    for (const connector of connectors) {
      const pattern = new RegExp(`([^，。！？；\\s])\\s*(${connector})`, 'g');
      result = result.replace(pattern, '$1，$2');
    }
    return result;
  }

  splitLongChineseSegments(text, maxSegmentLength = 28) {
    let result = '';
    let segmentLength = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1] || '';

      result += char;
      if (/[，。！？；]/.test(char)) {
        segmentLength = 0;
        continue;
      }

      if (/\s/.test(char)) {
        continue;
      }

      if (!/[\u4E00-\u9FFF]/.test(char)) {
        continue;
      }

      segmentLength += 1;
      if (
        segmentLength >= maxSegmentLength &&
        nextChar &&
        /[\u4E00-\u9FFF]/.test(nextChar) &&
        !/[，。！？；]/.test(nextChar)
      ) {
        result += '，';
        segmentLength = 0;
      }
    }

    return result;
  }
}

module.exports = WhisperEngine;
