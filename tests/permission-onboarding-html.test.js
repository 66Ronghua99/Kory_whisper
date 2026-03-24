const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const onboardingHtml = fs.readFileSync(
  path.join(__dirname, '../src/renderer/permission-onboarding.html'),
  'utf8'
);

test('permission onboarding html renders three permission cards with distinct status, reason, and repair actions', () => {
  assert.match(onboardingHtml, /<title>Kory Whisper 权限引导<\/title>/);
  assert.match(onboardingHtml, /id="permission-summary"/);
  assert.match(onboardingHtml, /id="refresh-permissions"/);

  assert.match(onboardingHtml, /data-permission-surface="microphone"/);
  assert.match(onboardingHtml, /data-permission-surface="accessibility"/);
  assert.match(onboardingHtml, /data-permission-surface="inputMonitoring"/);

  assert.match(onboardingHtml, /id="microphone-status"/);
  assert.match(onboardingHtml, /id="accessibility-status"/);
  assert.match(onboardingHtml, /id="inputMonitoring-status"/);

  assert.match(onboardingHtml, /id="microphone-reason"/);
  assert.match(onboardingHtml, /id="accessibility-reason"/);
  assert.match(onboardingHtml, /id="inputMonitoring-reason"/);

  assert.match(onboardingHtml, /id="microphone-action"/);
  assert.match(onboardingHtml, /id="accessibility-action"/);
  assert.match(onboardingHtml, /id="inputMonitoring-action"/);

  assert.match(onboardingHtml, /录制你说的话/);
  assert.match(onboardingHtml, /把转写结果输入到当前应用/);
  assert.match(onboardingHtml, /监听全局快捷键/);
});

test('permission onboarding html reuses the shared permission IPC endpoints', () => {
  assert.match(onboardingHtml, /ipcRenderer\.invoke\('get-permission-readiness'\)/);
  assert.match(onboardingHtml, /ipcRenderer\.invoke\('recheck-permission-readiness'\)/);
  assert.match(onboardingHtml, /ipcRenderer\.invoke\('open-permission-settings'/);
});
