const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { PassThrough } = require('stream');
const https = require('https');

const ModelDownloader = require('../src/main/model-downloader.js');

function createTempModelsDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kory-model-downloader-'));
}

function createResponse({ statusCode = 200, headers = {}, body = '' } = {}) {
  const response = new PassThrough();
  response.statusCode = statusCode;
  response.headers = headers;

  process.nextTick(() => {
    response.end(body);
  });

  return response;
}

async function withMockedHttpsGet(impl, callback) {
  const originalGet = https.get;
  https.get = impl;

  try {
    await callback();
  } finally {
    https.get = originalGet;
  }
}

function createRequestStub() {
  const request = new EventEmitter();
  request.on = request.addListener.bind(request);
  return request;
}

test('downloadModel rejects non-success responses and leaves no model artifact behind', async () => {
  const modelsDir = createTempModelsDir();
  const targetPath = path.join(modelsDir, 'ggml-base.bin');

  await withMockedHttpsGet((url, options, callback) => {
    const normalizedCallback = typeof options === 'function' ? options : callback;
    normalizedCallback(createResponse({
      statusCode: 403,
      headers: {
        'content-length': '9'
      },
      body: 'forbidden'
    }));
    return createRequestStub();
  }, async () => {
    const downloader = new ModelDownloader({ modelsDir });

    await assert.rejects(
      downloader.downloadModel('ggml-base.bin'),
      /unexpected response status/i
    );
  });

  assert.equal(fs.existsSync(targetPath), false);
  assert.equal(fs.existsSync(`${targetPath}.download`), false);
});

test('downloadModel rejects incomplete responses and leaves no partial model behind', async () => {
  const modelsDir = createTempModelsDir();
  const targetPath = path.join(modelsDir, 'ggml-base.bin');

  await withMockedHttpsGet((url, options, callback) => {
    const normalizedCallback = typeof options === 'function' ? options : callback;
    normalizedCallback(createResponse({
      statusCode: 200,
      headers: {
        'content-length': '100'
      },
      body: 'short'
    }));
    return createRequestStub();
  }, async () => {
    const downloader = new ModelDownloader({ modelsDir });

    await assert.rejects(
      downloader.downloadModel('ggml-base.bin'),
      /incomplete download/i
    );
  });

  assert.equal(fs.existsSync(targetPath), false);
  assert.equal(fs.existsSync(`${targetPath}.download`), false);
});

test('downloadModel reports byte progress even when content-length is unavailable', async () => {
  const modelsDir = createTempModelsDir();
  const progressEvents = [];
  const body = 'hello world';

  await withMockedHttpsGet((url, options, callback) => {
    const normalizedCallback = typeof options === 'function' ? options : callback;
    normalizedCallback(createResponse({
      statusCode: 200,
      headers: {},
      body
    }));
    return createRequestStub();
  }, async () => {
    const downloader = new ModelDownloader({ modelsDir });

    await downloader.downloadModel('ggml-base.bin', (progress) => {
      progressEvents.push(progress);
    });
  });

  assert.deepEqual(progressEvents, [
    {
      percent: null,
      downloadedBytes: Buffer.byteLength(body),
      totalBytes: null
    }
  ]);
});
