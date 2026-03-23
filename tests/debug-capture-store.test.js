const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const DebugCaptureStore = require('../src/main/debug-capture-store.js');

async function makeSourceArtifactFiles() {
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));
  const audioPath = path.join(sourceDir, 'audio.wav');
  const rawTextPath = path.join(sourceDir, 'raw.txt');

  await fs.writeFile(audioPath, 'audio-bytes', 'utf8');
  await fs.writeFile(rawTextPath, 'raw whisper output', 'utf8');

  return { sourceDir, audioPath, rawTextPath };
}

async function readMeta(captureDir) {
  const metaPath = path.join(captureDir, 'meta.json');
  return JSON.parse(await fs.readFile(metaPath, 'utf8'));
}

async function readCaptureMtimeNs(captureDir) {
  const metaPath = path.join(captureDir, 'meta.json');
  const stats = await fs.stat(metaPath, { bigint: true });
  return stats.mtimeNs;
}

async function readCaptureDirMtimeNs(captureDir) {
  const stats = await fs.stat(captureDir, { bigint: true });
  return stats.mtimeNs;
}

function isCaptureDirName(name) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{12}$/.test(name);
}

test('persist stores a capture in a timestamped directory under the provided root', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const { sourceDir, audioPath, rawTextPath } = await makeSourceArtifactFiles();

  try {
    const store = new DebugCaptureStore(captureRoot);
    const capture = await store.persist({
      timestamp: new Date('2026-03-23T08:00:00.000Z'),
      audioPath,
      rawTextPath,
      meta: {
        prompt: '请使用简体中文输出',
        result: 'hello world'
      }
    });

    assert.equal(path.dirname(capture.captureDirPath), captureRoot);
    assert.match(path.basename(capture.captureDirPath), /^2026-03-23T08-00-00-000Z-[a-f0-9]{12}$/);
    const captureEntries = await fs.readdir(capture.captureDirPath);
    captureEntries.sort();
    assert.deepEqual(captureEntries, ['audio.wav', 'meta.json', 'raw.txt']);

    assert.equal(await fs.readFile(path.join(capture.captureDirPath, 'audio.wav'), 'utf8'), 'audio-bytes');
    assert.equal(await fs.readFile(path.join(capture.captureDirPath, 'raw.txt'), 'utf8'), 'raw whisper output');

    const meta = await readMeta(capture.captureDirPath);
    assert.equal(meta.prompt, '请使用简体中文输出');
    assert.equal(meta.result, 'hello world');
    assert.equal(meta.captureDirPath, capture.captureDirPath);
    assert.equal(meta.captureRootPath, captureRoot);
    assert.equal(meta.paths.audioPath, path.join(capture.captureDirPath, 'audio.wav'));
    assert.equal(meta.paths.rawTextPath, path.join(capture.captureDirPath, 'raw.txt'));
    assert.equal(meta.paths.metaPath, path.join(capture.captureDirPath, 'meta.json'));
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist prunes the oldest captures beyond the retention count of three', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));

  try {
    const store = new DebugCaptureStore(captureRoot);

    for (let index = 1; index <= 4; index += 1) {
      const audioPath = path.join(sourceDir, `audio-${index}.wav`);
      await fs.writeFile(audioPath, `audio-${index}`, 'utf8');
      await store.persist({
        timestamp: new Date(Date.UTC(2026, 2, 23, 8, 0, index)),
        audioPath,
        meta: { index }
      });
    }

    const entries = (await fs.readdir(captureRoot)).filter(isCaptureDirName).sort();
    assert.equal(entries.length, 3);

    const captures = [];
    for (const entry of entries) {
      const captureDir = path.join(captureRoot, entry);
      captures.push({
        index: (await readMeta(captureDir)).index,
        createdOrder: await readCaptureMtimeNs(captureDir)
      });
    }

    captures.sort((a, b) => (a.createdOrder < b.createdOrder ? -1 : 1));
    const indexes = captures.map((meta) => meta.index);

    assert.deepEqual(indexes, [2, 3, 4]);
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist tolerates a missing optional source artifact and records the missing path', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));
  const audioPath = path.join(sourceDir, 'audio.wav');
  const missingRawTextPath = path.join(sourceDir, 'raw.txt');

  try {
    await fs.writeFile(audioPath, 'audio-bytes', 'utf8');

    const store = new DebugCaptureStore(captureRoot);
    const capture = await store.persist({
      timestamp: new Date('2026-03-23T08:00:00.000Z'),
      audioPath,
      rawTextPath: missingRawTextPath,
      meta: {
        result: 'hello world'
      }
    });

    const captureEntries = (await fs.readdir(capture.captureDirPath)).sort();
    assert.deepEqual(captureEntries, ['audio.wav', 'meta.json']);
    assert.equal(await fs.readFile(path.join(capture.captureDirPath, 'audio.wav'), 'utf8'), 'audio-bytes');

    const meta = await readMeta(capture.captureDirPath);
    assert.equal(meta.sourceTempPaths.audioPath, audioPath);
    assert.equal(meta.sourceTempPaths.rawTextPath, missingRawTextPath);
    assert.equal(meta.paths.audioPath, path.join(capture.captureDirPath, 'audio.wav'));
    assert.equal(meta.paths.rawTextPath, null);
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist logs and surfaces a real copy failure', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));
  const audioPath = path.join(sourceDir, 'audio.wav');
  const logs = [];
  const originalCopyFile = fs.copyFile;

  try {
    await fs.writeFile(audioPath, 'audio-bytes', 'utf8');
    fs.copyFile = async () => {
      const error = new Error('permission denied');
      error.code = 'EACCES';
      throw error;
    };

    const store = new DebugCaptureStore(captureRoot, {
      onError: (message, error) => {
        logs.push({ message, error });
      }
    });

    await assert.rejects(
      () => store.persist({
        timestamp: new Date('2026-03-23T08:00:00.000Z'),
        audioPath
      }),
      /permission denied/
    );

    assert.equal(logs.length, 1);
    assert.match(logs[0].message, /copy/i);
    assert.equal(logs[0].error.code, 'EACCES');
  } finally {
    fs.copyFile = originalCopyFile;
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist logs best-effort retention cleanup failures without aborting the capture', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));
  const logs = [];
  const originalRm = fs.rm;

  try {
    const store = new DebugCaptureStore(captureRoot, {
      onError: (message, error) => {
        logs.push({ message, error });
      }
    });

    for (let index = 1; index <= 3; index += 1) {
      const audioPath = path.join(sourceDir, `audio-${index}.wav`);
      await fs.writeFile(audioPath, `audio-${index}`, 'utf8');
      await store.persist({
        timestamp: new Date(Date.UTC(2026, 2, 23, 8, 0, index)),
        audioPath,
        meta: { index }
      });
    }

    fs.rm = async () => {
      const error = new Error('cleanup failed');
      error.code = 'EPERM';
      throw error;
    };

    const audioPath = path.join(sourceDir, 'audio-4.wav');
    await fs.writeFile(audioPath, 'audio-4', 'utf8');
    await store.persist({
      timestamp: new Date(Date.UTC(2026, 2, 23, 8, 0, 4)),
      audioPath,
      meta: { index: 4 }
    });

    assert.equal(logs.length > 0, true);
    assert.match(logs[0].message, /cleanup/i);
    assert.equal(logs[0].error.code, 'EPERM');
  } finally {
    fs.rm = originalRm;
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist leaves foreign directories alone and does not count them against retention', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));
  const foreignDirA = path.join(captureRoot, 'aaa-foreign-dir');
  const foreignDirB = path.join(captureRoot, 'zzz-foreign-dir');

  try {
    await fs.mkdir(foreignDirA);
    await fs.mkdir(foreignDirB);

    const store = new DebugCaptureStore(captureRoot);
    for (let index = 1; index <= 4; index += 1) {
      const audioPath = path.join(sourceDir, `audio-${index}.wav`);
      await fs.writeFile(audioPath, `audio-${index}`, 'utf8');
      await store.persist({
        timestamp: new Date(Date.UTC(2026, 2, 23, 8, 0, index)),
        audioPath,
        meta: { index }
      });
    }

    const entries = (await fs.readdir(captureRoot)).sort();
    assert.equal(entries.includes('aaa-foreign-dir'), true);
    assert.equal(entries.includes('zzz-foreign-dir'), true);

    const captureEntries = entries.filter((entry) => /^2026-03-23T08-00-0[2-4]-000Z-[a-f0-9]{12}$/.test(entry));
    assert.equal(captureEntries.length, 3);
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist rolls back a partial capture directory when copying fails', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));
  const audioPath = path.join(sourceDir, 'audio.wav');
  const logs = [];
  const originalCopyFile = fs.copyFile;

  try {
    await fs.writeFile(audioPath, 'audio-bytes', 'utf8');
    fs.copyFile = async () => {
      const error = new Error('permission denied');
      error.code = 'EACCES';
      throw error;
    };

    const store = new DebugCaptureStore(captureRoot, {
      onError: (message, error) => logs.push({ message, error })
    });

    await assert.rejects(
      () => store.persist({
        timestamp: new Date('2026-03-23T08:00:00.000Z'),
        audioPath
      }),
      /permission denied/
    );

    const entries = (await fs.readdir(captureRoot)).filter(isCaptureDirName);
    assert.equal(entries.length, 0);
    assert.equal(logs.length, 1);
  } finally {
    fs.copyFile = originalCopyFile;
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist rolls back a partial capture directory when meta write fails', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));
  const audioPath = path.join(sourceDir, 'audio.wav');
  const logs = [];
  const originalWriteFile = fs.writeFile;

  try {
    await fs.writeFile(audioPath, 'audio-bytes', 'utf8');

    fs.writeFile = async (filePath, contents, encoding) => {
      if (String(filePath).endsWith('meta.json')) {
        const error = new Error('meta write failed');
        error.code = 'EIO';
        throw error;
      }

      return originalWriteFile(filePath, contents, encoding);
    };

    const store = new DebugCaptureStore(captureRoot, {
      onError: (message, error) => logs.push({ message, error })
    });

    await assert.rejects(
      () => store.persist({
        timestamp: new Date('2026-03-23T08:00:00.000Z'),
        audioPath
      }),
      /meta write failed/
    );

    const entries = (await fs.readdir(captureRoot)).filter(isCaptureDirName);
    assert.equal(entries.length, 0);
    assert.equal(logs.length >= 1, true);
  } finally {
    fs.writeFile = originalWriteFile;
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

test('persist rejects an invalid Date object with the explicit timestamp error', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));

  try {
    const store = new DebugCaptureStore(captureRoot);
    const invalidDate = new Date('not-a-real-date');

    await assert.rejects(
      () => store.persist({ timestamp: invalidDate }),
      /DebugCaptureStore requires a valid timestamp/
    );
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
  }
});

test('separate store instances can persist the same timestamp without capture directory collisions', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDirA = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-a-'));
  const sourceDirB = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-b-'));
  const audioPathA = path.join(sourceDirA, 'audio.wav');
  const audioPathB = path.join(sourceDirB, 'audio.wav');

  try {
    await fs.writeFile(audioPathA, 'audio-a', 'utf8');
    await fs.writeFile(audioPathB, 'audio-b', 'utf8');

    const storeA = new DebugCaptureStore(captureRoot);
    const storeB = new DebugCaptureStore(captureRoot);

    const timestamp = new Date('2026-03-23T08:00:00.000Z');
    const captureA = await storeA.persist({ timestamp, audioPath: audioPathA, meta: { source: 'a' } });
    const captureB = await storeB.persist({ timestamp, audioPath: audioPathB, meta: { source: 'b' } });

    assert.notEqual(captureA.captureDirPath, captureB.captureDirPath);
    const entries = (await fs.readdir(captureRoot)).filter(isCaptureDirName).sort();
    assert.equal(entries.length, 2);
    assert.match(path.basename(captureA.captureDirPath), /^2026-03-23T08-00-00-000Z-[a-f0-9]{12}$/);
    assert.match(path.basename(captureB.captureDirPath), /^2026-03-23T08-00-00-000Z-[a-f0-9]{12}$/);
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDirA, { recursive: true, force: true });
    await fs.rm(sourceDirB, { recursive: true, force: true });
  }
});

test('retention keeps the newest three same-timestamp captures across store instances', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDirA = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-a-'));
  const sourceDirB = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-b-'));
  const audioPathA = path.join(sourceDirA, 'audio.wav');
  const audioPathB = path.join(sourceDirB, 'audio.wav');

  try {
    await fs.writeFile(audioPathA, 'audio-a', 'utf8');
    await fs.writeFile(audioPathB, 'audio-b', 'utf8');

    const storeA = new DebugCaptureStore(captureRoot);
    const storeB = new DebugCaptureStore(captureRoot);
    const timestamp = new Date('2026-03-23T08:00:00.000Z');

    for (const [store, audioPath, index] of [
      [storeA, audioPathA, 1],
      [storeB, audioPathB, 2],
      [storeA, audioPathA, 3],
      [storeB, audioPathB, 4]
    ]) {
      await store.persist({
        timestamp,
        audioPath,
        meta: { index }
      });
    }

    const captureDirs = (await fs.readdir(captureRoot)).filter(isCaptureDirName).sort();
    assert.equal(captureDirs.length, 3);

    const captures = [];
    for (const dirName of captureDirs) {
      const captureDir = path.join(captureRoot, dirName);
      captures.push({
        index: (await readMeta(captureDir)).index,
        createdOrder: await readCaptureMtimeNs(captureDir)
      });
    }

    captures.sort((a, b) => (a.createdOrder < b.createdOrder ? -1 : 1));
    assert.deepEqual(captures.map((meta) => meta.index), [2, 3, 4]);
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDirA, { recursive: true, force: true });
    await fs.rm(sourceDirB, { recursive: true, force: true });
  }
});

test('retention still prunes when an older capture is missing meta.json after restart', async () => {
  const captureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-captures-'));
  const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-debug-capture-source-'));

  try {
    const firstStore = new DebugCaptureStore(captureRoot);
    for (let index = 1; index <= 3; index += 1) {
      const audioPath = path.join(sourceDir, `restart-audio-${index}.wav`);
      await fs.writeFile(audioPath, `restart-audio-${index}`, 'utf8');
      await firstStore.persist({
        timestamp: new Date(Date.UTC(2026, 2, 23, 8, 0, index)),
        audioPath,
        meta: { index }
      });
    }

    const captureDirs = (await fs.readdir(captureRoot)).filter(isCaptureDirName).sort();
    assert.equal(captureDirs.length, 3);

    const orderedCaptures = [];
    for (const dirName of captureDirs) {
      const captureDir = path.join(captureRoot, dirName);
      orderedCaptures.push({
        dirName,
        createdOrder: await readCaptureDirMtimeNs(captureDir)
      });
    }

    orderedCaptures.sort((a, b) => (a.createdOrder < b.createdOrder ? -1 : 1));
    await fs.unlink(path.join(captureRoot, orderedCaptures[0].dirName, 'meta.json'));

    const restartStore = new DebugCaptureStore(captureRoot);
    const restartAudioPath = path.join(sourceDir, 'restart-audio-4.wav');
    await fs.writeFile(restartAudioPath, 'restart-audio-4', 'utf8');
    await restartStore.persist({
      timestamp: new Date(Date.UTC(2026, 2, 23, 8, 0, 4)),
      audioPath: restartAudioPath,
      meta: { index: 4 }
    });

    const remainingDirs = (await fs.readdir(captureRoot)).filter(isCaptureDirName);
    assert.equal(remainingDirs.length, 3);

    const indexes = [];
    for (const dirName of remainingDirs) {
      const captureDir = path.join(captureRoot, dirName);
      indexes.push((await readMeta(captureDir)).index);
    }

    assert.deepEqual(indexes.sort((a, b) => a - b), [2, 3, 4]);
    assert.equal(await exists(path.join(captureRoot, orderedCaptures[0].dirName)), false);
  } finally {
    await fs.rm(captureRoot, { recursive: true, force: true });
    await fs.rm(sourceDir, { recursive: true, force: true });
  }
});

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
