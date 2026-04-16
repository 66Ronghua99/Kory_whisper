const fs = require('node:fs/promises');
const crypto = require('node:crypto');

const { createAsrError, redactSecretText } = require('./errors');

const DEFAULT_ENDPOINT = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
const DEFAULT_MODEL = 'paraformer-realtime-v2';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_CHUNK_BYTES = 32 * 1024;

function getDefaultWebSocketClass() {
  try {
    return require('ws');
  } catch (error) {
    if (typeof WebSocket === 'function') {
      return WebSocket;
    }
    throw error;
  }
}

function normalizeMessage(message) {
  if (Buffer.isBuffer(message)) {
    return JSON.parse(message.toString('utf8'));
  }
  return JSON.parse(String(message));
}

function extractTranscript(payload = {}) {
  const output = payload.output || payload;
  const sentenceText = output.sentence?.text;
  if (typeof sentenceText === 'string' && sentenceText.trim()) {
    return sentenceText.trim();
  }

  if (typeof output.text === 'string' && output.text.trim()) {
    return output.text.trim();
  }

  if (Array.isArray(output.sentences)) {
    return output.sentences
      .map((sentence) => sentence?.text)
      .filter((text) => typeof text === 'string' && text.trim())
      .join('')
      .trim();
  }

  return '';
}

class AliyunParaformerEngine {
  constructor(options = {}) {
    this.apiKey = options.apiKey || '';
    this.model = options.model || DEFAULT_MODEL;
    this.endpoint = options.endpoint || DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.languageHints = options.languageHints || ['zh', 'en'];
    this.chunkBytes = options.chunkBytes || DEFAULT_CHUNK_BYTES;
    this.WebSocketClass = options.WebSocketClass || getDefaultWebSocketClass();
    this.taskIdFactory = options.taskIdFactory || (() => crypto.randomUUID());
    this.fs = options.fs || fs;
  }

  async transcribe(audioPath) {
    const apiKey = this.apiKey.trim();
    if (!apiKey) {
      throw new Error('Aliyun API key is required for cloud ASR');
    }

    const socket = new this.WebSocketClass(this.endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-DataInspection': 'enable'
      }
    });
    const taskId = this.taskIdFactory();
    let finalText = '';
    let settled = false;

    return new Promise((resolve, reject) => {
      const fail = (message) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.closeSocket(socket);
        reject(createAsrError(`Aliyun ASR failed: ${message}`, { secrets: [apiKey] }));
      };

      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.closeSocket(socket);
        resolve(finalText.trim());
      };

      const timeout = setTimeout(() => {
        fail(`request timed out after ${this.timeoutMs}ms`);
      }, this.timeoutMs);

      socket.on('open', () => {
        socket.send(JSON.stringify(this.createRunTaskMessage(taskId)));
      });

      socket.on('message', async (rawMessage) => {
        let message;
        try {
          message = normalizeMessage(rawMessage);
        } catch (error) {
          fail(`invalid provider message (${redactSecretText(error.message, [apiKey])})`);
          return;
        }

        const event = message.header?.event;
        if (event === 'task-started') {
          try {
            await this.streamAudio(socket, audioPath);
            socket.send(JSON.stringify(this.createFinishTaskMessage(taskId)));
          } catch (error) {
            fail(error.message);
          }
          return;
        }

        if (event === 'result-generated') {
          const text = extractTranscript(message.payload || {});
          if (text) {
            finalText = text;
          }
          return;
        }

        if (event === 'task-finished') {
          finish();
          return;
        }

        if (event === 'task-failed') {
          fail(message.header?.error_message || message.header?.error_code || 'provider task failed');
        }
      });

      socket.on('error', (error) => {
        fail(error.message || error);
      });

      socket.on('close', () => {
        if (!settled) {
          fail('connection closed before task finished');
        }
      });
    });
  }

  async testConnection() {
    const apiKey = this.apiKey.trim();
    if (!apiKey) {
      throw new Error('Aliyun API key is required for cloud ASR');
    }

    const socket = new this.WebSocketClass(this.endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-DataInspection': 'enable'
      }
    });
    const taskId = this.taskIdFactory();
    let settled = false;

    return new Promise((resolve, reject) => {
      const fail = (message) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.closeSocket(socket);
        reject(createAsrError(`Aliyun ASR failed: ${message}`, { secrets: [apiKey] }));
      };

      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.closeSocket(socket);
        resolve({ ok: true });
      };

      const timeout = setTimeout(() => {
        fail(`request timed out after ${this.timeoutMs}ms`);
      }, this.timeoutMs);

      socket.on('open', () => {
        socket.send(JSON.stringify(this.createRunTaskMessage(taskId)));
      });

      socket.on('message', (rawMessage) => {
        let message;
        try {
          message = normalizeMessage(rawMessage);
        } catch (error) {
          fail(`invalid provider message (${redactSecretText(error.message, [apiKey])})`);
          return;
        }

        if (message.header?.event === 'task-started') {
          finish();
          return;
        }

        if (message.header?.event === 'task-failed') {
          fail(message.header?.error_message || message.header?.error_code || 'provider task failed');
        }
      });

      socket.on('error', (error) => {
        fail(error.message || error);
      });

      socket.on('close', () => {
        if (!settled) {
          fail('connection closed before task started');
        }
      });
    });
  }

  createRunTaskMessage(taskId) {
    return {
      header: {
        action: 'run-task',
        task_id: taskId,
        streaming: 'duplex'
      },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        model: this.model,
        parameters: {
          format: 'wav',
          sample_rate: 16000,
          language_hints: this.languageHints
        }
      }
    };
  }

  createFinishTaskMessage(taskId) {
    return {
      header: {
        action: 'finish-task',
        task_id: taskId,
        streaming: 'duplex'
      },
      payload: {
        input: {}
      }
    };
  }

  async streamAudio(socket, audioPath) {
    const audio = await this.fs.readFile(audioPath);
    for (let offset = 0; offset < audio.length; offset += this.chunkBytes) {
      socket.send(audio.subarray(offset, offset + this.chunkBytes));
    }
  }

  closeSocket(socket) {
    if (socket && typeof socket.close === 'function') {
      socket.close();
    }
  }
}

module.exports = AliyunParaformerEngine;
module.exports.AliyunParaformerEngine = AliyunParaformerEngine;
module.exports.extractTranscript = extractTranscript;
