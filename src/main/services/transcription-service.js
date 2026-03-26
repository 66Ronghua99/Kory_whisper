const applyPostProcessingDefault = require('../post-processing/apply-pipeline');
const createDefaultPipeline = require('../post-processing/create-default-pipeline');
const {
  createPostProcessingContext: createPostProcessingContextDefault
} = require('../post-processing/context');
const {
  EMPTY_VOCABULARY_DATA,
  loadVocabularyData: loadVocabularyDataDefault
} = require('../vocabulary-data');

function resolveModelKey(model) {
  const validModels = ['base', 'small', 'medium'];
  return validModels.includes(model) ? model : 'base';
}

function getModelFilename(modelKey) {
  const mapping = {
    base: 'ggml-base.bin',
    small: 'ggml-small.bin',
    medium: 'ggml-medium.bin'
  };
  return mapping[resolveModelKey(modelKey)];
}

function getModelMinBytes(modelName) {
  const minBytes = {
    'ggml-base.bin': 100 * 1024 * 1024,
    'ggml-small.bin': 300 * 1024 * 1024,
    'ggml-medium.bin': 700 * 1024 * 1024
  };
  return minBytes[modelName] || 50 * 1024 * 1024;
}

function showModelDownloadError(dialog, detail) {
  if (!dialog || typeof dialog.showErrorBox !== 'function') {
    return;
  }

  dialog.showErrorBox('模型下载失败', `Whisper 模型未能准备完成。\n${detail}`);
}

function normalizeProgressPayload(progress) {
  if (progress && typeof progress === 'object' && !Array.isArray(progress)) {
    return {
      percent: progress.percent ?? null,
      downloadedBytes: typeof progress.downloadedBytes === 'number' ? progress.downloadedBytes : null,
      totalBytes: typeof progress.totalBytes === 'number' ? progress.totalBytes : null
    };
  }

  return {
    percent: progress ?? null,
    downloadedBytes: null,
    totalBytes: null
  };
}

class TranscriptionService {
  constructor(options = {}) {
    this.whisperEngine = options.whisperEngine;
    this.ensureModelReady = options.ensureModelReady || null;
    this.resolveModelPath = options.resolveModelPath || null;
    this.defaultVocabPath = options.defaultVocabPath || '';
    this.config = options.config || {};
    this.logger = options.logger || console;
    this.loadVocabularyData = options.loadVocabularyData || loadVocabularyDataDefault;
    this.createPostProcessingContext =
      options.createPostProcessingContext || createPostProcessingContextDefault;
    this.applyPostProcessing = options.applyPostProcessing || applyPostProcessingDefault;
    this.postProcessingPipeline = options.postProcessingPipeline || createDefaultPipeline();
  }

  async transcribe(audioPath) {
    const vocabularyData = await this.loadCurrentVocabularyData();
    const rawText = await this.whisperEngine.transcribe(audioPath);

    const postProcessingContext = this.createPostProcessingContext({
      config: this.config,
      runtime: {
        language: this.config.whisper?.language,
        outputScript: this.config.whisper?.outputScript
      },
      vocabulary: vocabularyData
    });

    return this.applyPostProcessing(rawText, postProcessingContext, {
      pipeline: this.postProcessingPipeline,
      logger: this.logger
    });
  }

  async loadCurrentVocabularyData() {
    const vocabPath = this.config.vocabulary?.path || this.defaultVocabPath;
    if (this.config.vocabulary?.enabled === false) {
      return EMPTY_VOCABULARY_DATA;
    }
    return this.loadVocabularyData(vocabPath);
  }

  updateRuntimeOptions(options = {}) {
    if (typeof this.whisperEngine.updateRuntimeOptions === 'function') {
      this.whisperEngine.updateRuntimeOptions(options);
    }
  }

  async applyConfig(config = {}) {
    this.config = config;

    const modelName = getModelFilename(config.whisper?.model);
    let modelPath = this.whisperEngine.modelPath;

    if (this.resolveModelPath) {
      const nextModelPath = this.resolveModelPath(modelName);
      if (this.ensureModelReady && this.whisperEngine.modelPath !== nextModelPath) {
        const modelReady = await this.ensureModelReady(modelName);
        if (!modelReady) {
          throw new Error(`Model is not ready, keeping the current selection: ${modelName}`);
        }
      }
      modelPath = nextModelPath;
    }

    this.updateRuntimeOptions({
      modelPath,
      language: config.whisper?.language || this.whisperEngine.language,
      prompt: config.whisper?.prompt || ''
    });

    this.defaultVocabPath = config.vocabulary?.path || this.defaultVocabPath;
  }

  async dispose() {
    if (typeof this.whisperEngine.stop === 'function') {
      await this.whisperEngine.stop();
      return;
    }

    if (this.whisperEngine.localLLM && typeof this.whisperEngine.localLLM.stopServer === 'function') {
      await this.whisperEngine.localLLM.stopServer();
    }
  }
}

function createDownloadProgressWindow(BrowserWindow, modelName, modelSize) {
  if (!BrowserWindow) {
    return null;
  }

  const progressWindow = new BrowserWindow({
    width: 400,
    height: 150,
    title: '下载模型中...',
    resizable: false,
    minimizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  progressWindow.loadURL(`data:text/html,
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: sans-serif; text-align: center; padding: 30px;">
      <h3>正在下载语音模型...</h3>
      <p id="progress">0%</p>
      <p style="font-size: 12px; color: #666;">模型: ${modelName} (${modelSize})</p>
    </body>
    <script>
      const { ipcRenderer } = require('electron');
      ipcRenderer.on('progress', (event, progress) => {
        const progressElement = document.getElementById('progress');
        if (progress && typeof progress === 'object') {
          if (progress.percent !== null && progress.percent !== undefined) {
            progressElement.textContent = progress.percent + '%';
            return;
          }

          const downloadedMb = progress.downloadedBytes !== null && progress.downloadedBytes !== undefined
            ? (progress.downloadedBytes / (1024 * 1024)).toFixed(1)
            : null;
          const totalMb = progress.totalBytes !== null && progress.totalBytes !== undefined
            ? (progress.totalBytes / (1024 * 1024)).toFixed(1)
            : null;

          if (downloadedMb !== null && totalMb !== null) {
            progressElement.textContent = downloadedMb + ' MB / ' + totalMb + ' MB';
            return;
          }

          if (downloadedMb !== null) {
            progressElement.textContent = '已下载 ' + downloadedMb + ' MB';
            return;
          }
        }

        progressElement.textContent = String(progress) + '%';
      });
    </script>
    </html>
  `);

  return progressWindow;
}

function createProgressWindowBridge(BrowserWindow, modelName, modelSize) {
  const progressWindow = createDownloadProgressWindow(BrowserWindow, modelName, modelSize);
  if (!progressWindow || !progressWindow.webContents) {
    return {
      publish() {},
      close() {}
    };
  }

  let isReadyToReceiveProgress = typeof progressWindow.webContents.once !== 'function';
  let latestProgress = null;

  if (!isReadyToReceiveProgress) {
    progressWindow.webContents.once('did-finish-load', () => {
      isReadyToReceiveProgress = true;
      if (latestProgress !== null && typeof progressWindow.webContents.send === 'function') {
        progressWindow.webContents.send('progress', latestProgress);
      }
    });
  }

  return {
    publish(progress) {
      latestProgress = normalizeProgressPayload(progress);
      if (isReadyToReceiveProgress && typeof progressWindow.webContents.send === 'function') {
        progressWindow.webContents.send('progress', latestProgress);
      }
    },
    close() {
      if (typeof progressWindow.close === 'function') {
        progressWindow.close();
      }
    }
  };
}

async function ensureModelReady(options = {}) {
  const modelName = options.modelName || 'ggml-base.bin';
  const runtimePaths = options.runtimePaths;
  const modelDownloader = options.modelDownloader || new (require('../model-downloader'))({
    modelsDir: runtimePaths.sharedModelsDir
  });
  const dialog = options.dialog || null;
  const BrowserWindow = options.BrowserWindow || null;

  const modelCheck = await modelDownloader.checkModel(modelName);
  const minSize = getModelMinBytes(modelName);
  const modelInfo = modelDownloader.getModelInfo(modelName);

  if (modelCheck.exists && modelCheck.size > minSize) {
    return true;
  }

  const bundledModelPath = runtimePaths.getBundledModelPath(modelName);
  const seededModel = await modelDownloader.seedModelFromPath(bundledModelPath, modelName);
  if (seededModel.copied && seededModel.size > minSize) {
    return true;
  }

  if (!dialog || typeof dialog.showMessageBox !== 'function') {
    throw new Error(`Model missing and no dialog available for download prompt: ${modelName}`);
  }

  const result = await dialog.showMessageBox({
    type: 'info',
    buttons: ['下载模型', '取消'],
    defaultId: 0,
    title: '需要语音模型',
    message: '首次运行需要下载 Whisper 语音模型。',
    detail: `模型: ${modelName}\n大小: 约 ${modelInfo.size}\n说明: ${modelInfo.desc}`
  });

  if (result.response !== 0) {
    return false;
  }

  const progressWindow = createProgressWindowBridge(BrowserWindow, modelName, modelInfo.size);

  try {
    await modelDownloader.downloadModel(modelName, (progress) => {
      progressWindow.publish(progress);
    });

    progressWindow.close();

    const downloadedModelCheck = await modelDownloader.checkModel(modelName);
    if (!downloadedModelCheck.exists || downloadedModelCheck.size <= minSize) {
      showModelDownloadError(
        dialog,
        `Downloaded file is incomplete for ${modelName}. Expected more than ${minSize} bytes, got ${downloadedModelCheck.size || 0}.`
      );
      return false;
    }

    return true;
  } catch (error) {
    progressWindow.close();
    showModelDownloadError(dialog, error.message);
    return false;
  }
}

async function prepareTranscriptionService(options = {}) {
  const runtimePaths = options.runtimePaths;
  const config = options.config || {};
  const logger = options.logger || console;
  const WhisperEngine = options.WhisperEngine || require('../whisper-engine');
  const DebugCaptureStore = options.DebugCaptureStore || require('../debug-capture-store');
  const injectedWhisperEngine = options.whisperEngine || null;

  const modelName = getModelFilename(config.whisper?.model);
  if (injectedWhisperEngine) {
    return new TranscriptionService({
      whisperEngine: injectedWhisperEngine,
      config,
      logger,
      defaultVocabPath: config.vocabulary?.path,
      loadVocabularyData: options.loadVocabularyData,
      createPostProcessingContext: options.createPostProcessingContext,
      applyPostProcessing: options.applyPostProcessing,
      postProcessingPipeline: options.postProcessingPipeline
    });
  }

  const modelReady = await ensureModelReady({
    modelName,
    runtimePaths,
    modelDownloader: options.modelDownloader,
    dialog: options.dialog,
    BrowserWindow: options.BrowserWindow
  });

  if (!modelReady) {
    return null;
  }

  const debugCaptureStore = options.debugCaptureStore || new DebugCaptureStore(
    runtimePaths.sharedDebugCapturesDir,
    {
      onError: (message, error) => logger.error('[DebugCaptureStore]', message, error)
    }
  );

  const whisperEngine = new WhisperEngine({
    modelPath: runtimePaths.getSharedModelPath(modelName),
    language: config.whisper?.language || 'zh',
    prompt: config.whisper?.prompt || '',
    whisperBin: runtimePaths.whisperBinPath,
    debugCaptureStore
  });

  return new TranscriptionService({
    whisperEngine,
    config,
    logger,
    defaultVocabPath: config.vocabulary?.path,
    ensureModelReady: (nextModelName) => ensureModelReady({
      modelName: nextModelName,
      runtimePaths,
      modelDownloader: options.modelDownloader,
      dialog: options.dialog,
      BrowserWindow: options.BrowserWindow
    }),
    resolveModelPath: (nextModelName) => runtimePaths.getSharedModelPath(nextModelName),
    loadVocabularyData: options.loadVocabularyData,
    createPostProcessingContext: options.createPostProcessingContext,
    applyPostProcessing: options.applyPostProcessing,
    postProcessingPipeline: options.postProcessingPipeline
  });
}

module.exports = TranscriptionService;
module.exports.TranscriptionService = TranscriptionService;
module.exports.resolveModelKey = resolveModelKey;
module.exports.getModelFilename = getModelFilename;
module.exports.prepareTranscriptionService = prepareTranscriptionService;
