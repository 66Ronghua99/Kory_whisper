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

async function createCaptureStoreSpy({ captureRoot, persistHook }) {
  let persistCalls = 0;

  return {
    persistCalls: () => persistCalls,
    store: {
      async persist(input) {
        persistCalls += 1;
        return persistHook(input, persistCalls, captureRoot);
      }
    }
  };
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

test('transcribe persists the effective prompt, args, stdout and raw text before cleanup on success', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-engine-'));
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-captures-'));
  const audioPath = path.join(tempDir, 'sample.wav');
  const txtPath = path.join(tempDir, 'sample.txt');
  const vocabPath = path.join(tempDir, 'vocab.json');
  const sourceText = '繁體 JMI';
  const stdoutText = 'stdout summary';
  const stderrText = 'stderr summary';
  await fs.writeFile(txtPath, sourceText, 'utf8');
  await fs.writeFile(audioPath, 'audio-bytes', 'utf8');
  await fs.writeFile(vocabPath, JSON.stringify({ words: ['Gemini'] }), 'utf8');
  let persistedCapture = null;

  const expectedPrompt = '自定义。请使用简体中文输出。Gemini。';
  const expectedArgs = [
    '-m', '/tmp/model.bin',
    '-f', audioPath,
    '-l', 'zh',
    '-otxt',
    '-of', path.join(tempDir, 'sample'),
    '--no-timestamps',
    '--prompt', expectedPrompt
  ];

  try {
    const spy = await createCaptureStoreSpy({
      captureRoot,
      persistHook: async (input) => {
        assert.equal(input.audioPath, audioPath);
        assert.equal(input.rawTextPath, txtPath);
        assert.equal(input.meta.prompt, expectedPrompt);
        assert.deepEqual(input.meta.args, expectedArgs);
        assert.equal(input.meta.stdoutSummary, stdoutText);
        assert.equal(input.meta.stderrSummary, stderrText);
        assert.equal(input.meta.stdoutCharCount, stdoutText.length);
        assert.equal(input.meta.stderrCharCount, stderrText.length);
        assert.equal(input.meta.finalText, '繁体 Gemini');
        assert.equal(input.meta.errorMessage, null);
        assert.equal(await fs.readFile(txtPath, 'utf8'), sourceText);
        assert.equal(await fs.readFile(audioPath, 'utf8'), 'audio-bytes');

        const captureDirPath = path.join(captureRoot, 'capture-1');
        await fs.mkdir(captureDirPath, { recursive: true });
        await fs.writeFile(path.join(captureDirPath, 'audio.wav'), 'captured-audio', 'utf8');
        await fs.writeFile(path.join(captureDirPath, 'raw.txt'), sourceText, 'utf8');
        await fs.writeFile(path.join(captureDirPath, 'meta.json'), JSON.stringify({ ok: true }), 'utf8');

        const captureRecord = {
          captureDirPath,
          paths: {
            audioPath: path.join(captureDirPath, 'audio.wav'),
            rawTextPath: path.join(captureDirPath, 'raw.txt'),
            metaPath: path.join(captureDirPath, 'meta.json')
          }
        };
        persistedCapture = captureRecord;
        return captureRecord;
      }
    });

    await withMockedExecFile((bin, args, options, callback) => {
      callback(null, stdoutText, stderrText);
    }, async (WhisperEngine) => {
      const engine = new WhisperEngine({
        modelPath: '/tmp/model.bin',
        whisperBin: '/tmp/whisper-cli',
        language: 'zh',
        prompt: '  自定义  ',
        vocabPath,
        outputScript: 'simplified',
        enablePunctuation: false,
        debugCaptureStore: spy.store
      });

      const result = await engine.transcribe(audioPath);
      assert.equal(result, '繁体 Gemini');
    });

    assert.equal(spy.persistCalls(), 1);
    assert.ok(persistedCapture);
    assert.equal(persistedCapture.captureDirPath.startsWith(captureRoot), true);
    assert.equal(await fs.readFile(persistedCapture.paths.audioPath, 'utf8'), 'captured-audio');
    assert.equal(await fs.readFile(persistedCapture.paths.rawTextPath, 'utf8'), sourceText);
    assert.ok(await fs.stat(persistedCapture.paths.metaPath));
    await assert.rejects(() => fs.stat(audioPath), /ENOENT/);
    await assert.rejects(() => fs.stat(txtPath), /ENOENT/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(captureRoot, { recursive: true, force: true });
  }
});

test('transcribe persists failure evidence before cleanup when whisper-cli exits with an error', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-engine-'));
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-whisper-captures-'));
  const audioPath = path.join(tempDir, 'sample.wav');
  const txtPath = path.join(tempDir, 'sample.txt');
  const stdoutText = 'partial stdout';
  const stderrText = 'process timed out after 60000ms';
  await fs.writeFile(audioPath, 'audio-bytes', 'utf8');
  await fs.writeFile(txtPath, 'tail only', 'utf8');
  let persistedCapture = null;

  try {
    const spy = await createCaptureStoreSpy({
      captureRoot,
      persistHook: async (input) => {
        assert.equal(input.audioPath, audioPath);
        assert.equal(input.rawTextPath, txtPath);
        assert.match(input.meta.errorMessage, /timed out/i);
        assert.equal(input.meta.finalText, null);
        assert.equal(input.meta.stdoutSummary, stdoutText);
        assert.equal(input.meta.stderrSummary, stderrText);
        assert.equal(input.meta.stdoutCharCount, stdoutText.length);
        assert.equal(input.meta.stderrCharCount, stderrText.length);
        assert.equal(await fs.readFile(txtPath, 'utf8'), 'tail only');
        assert.equal(await fs.readFile(audioPath, 'utf8'), 'audio-bytes');

        const captureDirPath = path.join(captureRoot, 'capture-1');
        await fs.mkdir(captureDirPath, { recursive: true });
        await fs.writeFile(path.join(captureDirPath, 'audio.wav'), 'captured-audio', 'utf8');
        await fs.writeFile(path.join(captureDirPath, 'raw.txt'), 'tail only', 'utf8');
        await fs.writeFile(path.join(captureDirPath, 'meta.json'), JSON.stringify({ ok: false }), 'utf8');

        const captureRecord = {
          captureDirPath,
          paths: {
            audioPath: path.join(captureDirPath, 'audio.wav'),
            rawTextPath: path.join(captureDirPath, 'raw.txt'),
            metaPath: path.join(captureDirPath, 'meta.json')
          }
        };
        persistedCapture = captureRecord;
        return captureRecord;
      }
    });

    await withMockedExecFile((bin, args, options, callback) => {
      const error = new Error('Command failed because it timed out');
      error.killed = true;
      error.signal = 'SIGTERM';
      callback(error, stdoutText, stderrText);
    }, async (WhisperEngine) => {
      const engine = new WhisperEngine({
        modelPath: '/tmp/model.bin',
        whisperBin: '/tmp/whisper-cli',
        debugCaptureStore: spy.store
      });

      await assert.rejects(
        () => engine.transcribe(audioPath),
        /timed out/i
      );
    });

    assert.equal(spy.persistCalls(), 1);
    assert.ok(persistedCapture);
    assert.equal(persistedCapture.captureDirPath.startsWith(captureRoot), true);
    assert.equal(await fs.readFile(persistedCapture.paths.audioPath, 'utf8'), 'captured-audio');
    assert.equal(await fs.readFile(persistedCapture.paths.rawTextPath, 'utf8'), 'tail only');
    assert.ok(await fs.stat(persistedCapture.paths.metaPath));
    await assert.rejects(() => fs.stat(audioPath), /ENOENT/);
    await assert.rejects(() => fs.stat(txtPath), /ENOENT/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(captureRoot, { recursive: true, force: true });
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
