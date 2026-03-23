const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTextForClipboard,
  deliverTextToClipboard
} = require('../src/main/platform/clipboard-output.js');

test('normalizeTextForClipboard preserves sentence-final punctuation and respects appendSpace false', () => {
  assert.equal(
    normalizeTextForClipboard('  你好。  ', { appendSpace: true }),
    '你好。'
  );

  assert.equal(
    normalizeTextForClipboard('  你好  ', { appendSpace: false }),
    '你好'
  );
});

test('deliverTextToClipboard copies processed text without reading previous clipboard content', async () => {
  const writes = [];
  let readCalls = 0;

  const clipboard = {
    writeText(value) {
      writes.push(value);
    },
    readText() {
      readCalls += 1;
      return 'previous clipboard value';
    }
  };

  const result = await deliverTextToClipboard('  你好世界  ', {
    appendSpace: true,
    clipboard
  });

  assert.equal(result, '你好世界 ');
  assert.deepEqual(writes, ['你好世界 ']);
  assert.equal(readCalls, 0);
});

test('deliverTextToClipboard skips empty text without touching the clipboard', async () => {
  const writes = [];

  const clipboard = {
    writeText(value) {
      writes.push(value);
    }
  };

  const result = await deliverTextToClipboard('   ', {
    appendSpace: true,
    clipboard
  });

  assert.equal(result, null);
  assert.deepEqual(writes, []);
});
