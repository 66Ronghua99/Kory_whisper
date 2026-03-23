const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

const whisperEngineModulePath = require.resolve('../src/main/whisper-engine.js');

async function withMockedExecFile(mockExecFile, runTest) {
  const originalExecFile = childProcess.execFile;
  childProcess.execFile = mockExecFile;
  delete require.cache[whisperEngineModulePath];
  const WhisperEngine = require('../src/main/whisper-engine.js');

  try {
    await runTest(WhisperEngine);
  } finally {
    childProcess.execFile = originalExecFile;
    delete require.cache[whisperEngineModulePath];
  }
}

test('transcribe returns the output text when whisper-cli completes successfully', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-engine-'));
  const audioPath = path.join(tempDir, 'sample.wav');
  const txtPath = path.join(tempDir, 'sample.txt');

  await fs.writeFile(txtPath, 'hello world', 'utf8');

  try {
    await withMockedExecFile((bin, args, options, callback) => {
      callback(null, '', '');
    }, async (WhisperEngine) => {
      const engine = new WhisperEngine({
        modelPath: '/tmp/model.bin',
        whisperBin: '/tmp/whisper-cli',
        language: 'en',
        outputScript: 'original',
        enablePunctuation: false
      });

      const result = await engine.transcribe(audioPath);
      assert.equal(result, 'hello world');
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('transcribe rejects partial output when whisper-cli exits with an error', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-engine-'));
  const audioPath = path.join(tempDir, 'sample.wav');
  const txtPath = path.join(tempDir, 'sample.txt');

  await fs.writeFile(txtPath, 'tail only', 'utf8');

  try {
    await withMockedExecFile((bin, args, options, callback) => {
      const error = new Error('Command failed because it timed out');
      error.killed = true;
      error.signal = 'SIGTERM';
      callback(error, '', 'process timed out after 60000ms');
    }, async (WhisperEngine) => {
      const engine = new WhisperEngine({
        modelPath: '/tmp/model.bin',
        whisperBin: '/tmp/whisper-cli'
      });

      await assert.rejects(
        () => engine.transcribe(audioPath),
        /timed out|process timed out/i
      );
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
