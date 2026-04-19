const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { AliyunParaformerEngine } = require('../src/main/asr/aliyun-paraformer-engine.js');

class FakeWebSocket extends EventEmitter {
  static instances = [];

  constructor(url, options = {}) {
    super();
    this.url = url;
    this.options = options;
    this.sent = [];
    this.closed = false;
    FakeWebSocket.instances.push(this);
    setImmediate(() => this.emit('open'));
  }

  send(payload) {
    this.sent.push(payload);
    if (typeof payload !== 'string') {
      return;
    }

    const message = JSON.parse(payload);
    if (message.header.action === 'run-task') {
      setImmediate(() => {
        this.emit('message', JSON.stringify({
          header: {
            event: 'task-started',
            task_id: message.header.task_id
          }
        }));
      });
      return;
    }

    if (message.header.action === 'finish-task') {
      setImmediate(() => {
        this.emit('message', JSON.stringify({
          header: {
            event: 'result-generated',
            task_id: message.header.task_id
          },
          payload: {
            output: {
              sentence: {
                text: '你好 world'
              }
            }
          }
        }));
        this.emit('message', JSON.stringify({
          header: {
            event: 'task-finished',
            task_id: message.header.task_id
          }
        }));
      });
    }
  }

  close() {
    this.closed = true;
  }
}

async function withAudioFile(fn) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kory-aliyun-asr-'));
  const audioPath = path.join(tempDir, 'sample.wav');
  await fs.writeFile(audioPath, Buffer.from('fake-wav-audio'));

  try {
    return await fn(audioPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('AliyunParaformerEngine rejects missing API keys before opening a websocket', async () => {
  FakeWebSocket.instances = [];
  const engine = new AliyunParaformerEngine({
    apiKey: '',
    WebSocketClass: FakeWebSocket
  });

  await assert.rejects(
    () => engine.transcribe('/tmp/sample.wav'),
    /Aliyun API key is required/
  );
  assert.equal(FakeWebSocket.instances.length, 0);
});

test('AliyunParaformerEngine updates the API key used by later transcriptions', async () => {
  FakeWebSocket.instances = [];
  const engine = new AliyunParaformerEngine({
    apiKey: '',
    WebSocketClass: FakeWebSocket,
    taskIdFactory: () => 'task-updated-key'
  });

  engine.updateRuntimeOptions({
    apiKey: 'sk-updated-key'
  });

  const text = await withAudioFile((audioPath) => engine.transcribe(audioPath));

  assert.equal(text, '你好 world');
  assert.equal(FakeWebSocket.instances.length, 1);
  assert.equal(FakeWebSocket.instances[0].options.headers.Authorization, 'Bearer sk-updated-key');
});

test('AliyunParaformerEngine streams a completed local audio file and returns final transcript text', async () => {
  FakeWebSocket.instances = [];
  const engine = new AliyunParaformerEngine({
    apiKey: 'sk-test-key',
    model: 'paraformer-realtime-v2',
    WebSocketClass: FakeWebSocket,
    taskIdFactory: () => 'task-123'
  });

  const text = await withAudioFile((audioPath) => engine.transcribe(audioPath));

  assert.equal(text, '你好 world');
  assert.equal(FakeWebSocket.instances.length, 1);
  const socket = FakeWebSocket.instances[0];
  assert.equal(socket.url, 'wss://dashscope.aliyuncs.com/api-ws/v1/inference');
  assert.equal(socket.options.headers.Authorization, 'Bearer sk-test-key');

  const runTask = JSON.parse(socket.sent[0]);
  assert.equal(runTask.header.action, 'run-task');
  assert.equal(runTask.header.task_id, 'task-123');
  assert.equal(runTask.payload.model, 'paraformer-realtime-v2');
  assert.deepEqual(runTask.payload.input, {});
  assert.equal(runTask.payload.parameters.format, 'wav');
  assert.deepEqual(runTask.payload.parameters.language_hints, ['zh', 'en']);

  assert.ok(Buffer.isBuffer(socket.sent[1]));
  const finishTask = JSON.parse(socket.sent[2]);
  assert.equal(finishTask.header.action, 'finish-task');
  assert.equal(finishTask.header.task_id, 'task-123');
});

test('AliyunParaformerEngine testConnection validates websocket reachability without streaming audio', async () => {
  FakeWebSocket.instances = [];
  const engine = new AliyunParaformerEngine({
    apiKey: 'sk-test-key',
    WebSocketClass: FakeWebSocket,
    taskIdFactory: () => 'connection-test'
  });

  const result = await engine.testConnection();

  assert.deepEqual(result, { ok: true });
  const socket = FakeWebSocket.instances[0];
  assert.equal(socket.options.headers.Authorization, 'Bearer sk-test-key');
  const runTask = JSON.parse(socket.sent[0]);
  assert.equal(runTask.header.action, 'run-task');
  assert.equal(runTask.header.task_id, 'connection-test');
  assert.deepEqual(runTask.payload.input, {});
  assert.equal(socket.sent.length, 1);
  assert.equal(socket.closed, true);
});

test('AliyunParaformerEngine redacts API keys from provider failures', async () => {
  class FailingWebSocket extends FakeWebSocket {
    send(payload) {
      this.sent.push(payload);
      if (typeof payload === 'string') {
        const message = JSON.parse(payload);
        if (message.header.action === 'run-task') {
          setImmediate(() => {
            this.emit('message', JSON.stringify({
              header: {
                event: 'task-failed',
                task_id: message.header.task_id,
                error_message: 'invalid sk-secret-key'
              }
            }));
          });
        }
      }
    }
  }

  const engine = new AliyunParaformerEngine({
    apiKey: 'sk-secret-key',
    WebSocketClass: FailingWebSocket,
    taskIdFactory: () => 'task-failed'
  });

  await withAudioFile(async (audioPath) => {
    await assert.rejects(
      () => engine.transcribe(audioPath),
      (error) => {
        assert.match(error.message, /Aliyun ASR failed/);
        assert.doesNotMatch(error.message, /sk-secret-key/);
        return true;
      }
    );
  });
});
