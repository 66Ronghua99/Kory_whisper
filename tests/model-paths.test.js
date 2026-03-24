const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getSharedModelsDir,
  getSharedModelPath,
  getBundledModelPath
} = require('../src/main/shared/model-paths.js');

test('shared Whisper model paths resolve under the user-space .kory-whisper models directory', () => {
  const homeDir = '/Users/tester';

  assert.equal(
    getSharedModelsDir({ homeDir }),
    '/Users/tester/.kory-whisper/models'
  );

  assert.equal(
    getSharedModelPath('ggml-base.bin', { homeDir }),
    '/Users/tester/.kory-whisper/models/ggml-base.bin'
  );
});

test('packaged runs expose a bundled seed path while development runs do not', () => {
  assert.equal(
    getBundledModelPath('ggml-base.bin', {
      isPackaged: false,
      resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources'
    }),
    null
  );

  assert.equal(
    getBundledModelPath('ggml-base.bin', {
      isPackaged: true,
      resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources'
    }),
    '/Applications/Kory Whisper.app/Contents/Resources/models/ggml-base.bin'
  );
});

test('model path helpers fail fast when modelName is undefined', () => {
  assert.throws(
    () => getSharedModelPath(undefined, { homeDir: '/Users/tester' }),
    {
      name: 'TypeError'
    }
  );

  assert.throws(
    () => getBundledModelPath(undefined, {
      isPackaged: true,
      resourcesPath: '/Applications/Kory Whisper.app/Contents/Resources'
    }),
    {
      name: 'TypeError'
    }
  );
});
