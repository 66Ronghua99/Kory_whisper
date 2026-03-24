const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const onboardingHtml = fs.readFileSync(
  path.join(__dirname, '../src/renderer/permission-onboarding.html'),
  'utf8'
);

test('permission onboarding html declares contract-driven permission rendering contract', () => {
  assert.match(onboardingHtml, /<title>Kory Whisper 权限引导<\/title>/);
  assert.match(onboardingHtml, /id="onboarding-title"/);
  assert.match(onboardingHtml, /id="onboarding-lead"/);

  assert.match(onboardingHtml, /permissionContractState/);
  assert.match(onboardingHtml, /mergePermissionContract/);
  assert.match(onboardingHtml, /getContractSurfaceOrder/);
  assert.match(onboardingHtml, /getSurfaceConfig/);
  assert.match(onboardingHtml, /renderSurfaceCard/);
  assert.match(onboardingHtml, /renderPermissionMetadata/);
  assert.match(onboardingHtml, /renderSurfaces/);

  assert.match(onboardingHtml, /id="permission-summary"/);
  assert.match(onboardingHtml, /id="permission-updated-at"/);
  assert.match(onboardingHtml, /id="permission-grid"/);
  assert.match(onboardingHtml, /data-permission-surface/);

  assert.match(onboardingHtml, /microphone/);
  assert.match(onboardingHtml, /accessibility/);
  assert.match(onboardingHtml, /inputMonitoring/);

  assert.match(onboardingHtml, /open-permission-settings/);
  assert.match(onboardingHtml, /permission-readiness-updated/);
});

test('permission onboarding html exposes menu and onboarding strings in fallback contract', () => {
  assert.match(onboardingHtml, /readySummary/);
  assert.match(onboardingHtml, /blockedSummary/);
  assert.match(onboardingHtml, /noPermissionMessage/);
  assert.match(onboardingHtml, /openPermissionSetupLabel/);
  assert.match(onboardingHtml, /recheckPermissionsLabel/);
  assert.match(onboardingHtml, /statusLabels/);

  assert.match(onboardingHtml, /Microphone/);
  assert.match(onboardingHtml, /Accessibility/);
  assert.match(onboardingHtml, /Input Monitoring/);
});

test('permission onboarding html reuses shared permission IPC endpoints', () => {
  assert.match(onboardingHtml, /ipcRenderer\.invoke\('get-config'\)/);
  assert.match(onboardingHtml, /ipcRenderer\.invoke\('get-permission-readiness'\)/);
  assert.match(onboardingHtml, /ipcRenderer\.invoke\('recheck-permission-readiness'\)/);
  assert.match(onboardingHtml, /ipcRenderer\.invoke\('open-permission-settings'/);
  assert.match(onboardingHtml, /ipcRenderer\.on\('permission-readiness-updated'/);
});
