const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const logger = require('../src/main/logger.js');

test('logger writes Error message and code instead of an empty object', async () => {
  const originalLogDir = logger.logDir;
  const originalLogFile = logger.logFile;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-logger-'));

  try {
    logger.logDir = tempDir;
    logger.logFile = path.join(tempDir, 'app.log');
    await logger.init();

    const error = new Error('cloud transcription failed');
    error.code = 'ALIYUN_ASR_FAILED';

    await logger.error('[Main] Processing error:', error);

    const logContent = await fs.readFile(logger.logFile, 'utf-8');
    assert.match(logContent, /cloud transcription failed/);
    assert.match(logContent, /ALIYUN_ASR_FAILED/);
    assert.doesNotMatch(logContent, /Processing error: \{\}/);
  } finally {
    logger.logDir = originalLogDir;
    logger.logFile = originalLogFile;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
