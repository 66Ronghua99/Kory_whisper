const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('test-keyboard self-test uses the active keyboard listener dependency', () => {
  const scriptPath = path.join(__dirname, '..', 'test-keyboard.js');
  const result = spawnSync(process.execPath, [scriptPath, '--self-test'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, `expected exit code 0, got ${result.status}\n${result.stderr}`);
  assert.match(result.stdout, /uiohook-napi/);
});
