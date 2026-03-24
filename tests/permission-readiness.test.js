const test = require('node:test');
const assert = require('node:assert/strict');

const buildPermissionReadiness = require('../src/main/services/permission-readiness.js');

test('builds not-ready snapshot when input monitoring is missing or unknown', () => {
  const snapshot = buildPermissionReadiness({
    microphone: { granted: false, canRequest: true },
    accessibility: { granted: true },
    inputMonitoring: { status: 'unknown' }
  });

  assert.equal(typeof snapshot.refreshedAt, 'string');
  assert.equal(snapshot.isReady, false);
  assert.equal(snapshot.firstRunNeedsOnboarding, true);
  assert.deepEqual(snapshot.surfaces, {
    microphone: {
      status: 'missing',
      reason: 'required-for-recording',
      cta: 'request-or-open-settings',
      settingsTarget: 'microphone'
    },
    accessibility: {
      status: 'granted',
      reason: null,
      cta: null,
      settingsTarget: 'accessibility'
    },
    inputMonitoring: {
      status: 'unknown',
      reason: 'required-for-global-hotkey',
      cta: 'open-settings-and-recheck',
      settingsTarget: 'input-monitoring'
    }
  });
});

test('builds ready snapshot only when microphone accessibility and input monitoring are granted', () => {
  const snapshot = buildPermissionReadiness({
    microphone: { granted: true, canRequest: false },
    accessibility: { granted: true },
    inputMonitoring: { status: 'granted' }
  });

  assert.equal(snapshot.isReady, true);
  assert.equal(snapshot.firstRunNeedsOnboarding, false);
  assert.deepEqual(snapshot.surfaces.microphone, {
    status: 'granted',
    reason: null,
    cta: null,
    settingsTarget: 'microphone'
  });
  assert.deepEqual(snapshot.surfaces.accessibility, {
    status: 'granted',
    reason: null,
    cta: null,
    settingsTarget: 'accessibility'
  });
  assert.deepEqual(snapshot.surfaces.inputMonitoring, {
    status: 'granted',
    reason: null,
    cta: null,
    settingsTarget: 'input-monitoring'
  });
});

test('preserves per-surface cta and settings target in the normalized snapshot', () => {
  const snapshot = buildPermissionReadiness({
    microphone: { granted: false, canRequest: true },
    accessibility: { granted: false },
    inputMonitoring: { status: 'unknown' }
  });

  assert.equal(snapshot.surfaces.microphone.cta, 'request-or-open-settings');
  assert.equal(snapshot.surfaces.accessibility.cta, 'open-settings-and-recheck');
  assert.equal(snapshot.surfaces.inputMonitoring.cta, 'open-settings-and-recheck');
  assert.equal(snapshot.surfaces.microphone.settingsTarget, 'microphone');
  assert.equal(snapshot.surfaces.accessibility.settingsTarget, 'accessibility');
  assert.equal(snapshot.surfaces.inputMonitoring.settingsTarget, 'input-monitoring');
});

test('keeps unsupported permission models ready instead of not-ready by default', () => {
  const snapshot = buildPermissionReadiness({
    permissionsSupported: false
  });

  assert.equal(snapshot.isReady, true);
  assert.equal(snapshot.firstRunNeedsOnboarding, false);
  assert.equal(snapshot.surfaces.microphone.status, 'unsupported');
  assert.equal(snapshot.surfaces.accessibility.status, 'unsupported');
  assert.equal(snapshot.surfaces.inputMonitoring.status, 'unsupported');
});

test('includes a refresh marker on every snapshot', () => {
  const snapshot = buildPermissionReadiness({
    microphone: { granted: true, canRequest: false },
    accessibility: { granted: true },
    inputMonitoring: { status: 'granted' }
  });

  assert.equal(typeof snapshot.refreshedAt, 'string');
  assert.ok(snapshot.refreshedAt.length > 0);
});

test('contracts can narrow the active blocked surface set and produce ordered snapshots', () => {
  const snapshot = buildPermissionReadiness.buildPermissionReadinessWithContract(
    {
      microphone: { granted: true },
      accessibility: { granted: false },
      inputMonitoring: { status: 'missing' }
    },
    {
      surfaces: [
        {
          key: 'microphone',
          onboardingLabel: '麦克风',
          menuLabel: '麦克风',
          settingsTarget: 'microphone',
          actionLabel: '麦克风设置'
        }
      ],
      surfaceOrder: ['microphone']
    }
  );

  assert.equal(snapshot.surfaces.microphone.status, 'granted');
  assert.equal(snapshot.surfaceOrder.join(','), 'microphone');
  assert.equal(snapshot.isReady, true);
  assert.equal(snapshot.firstRunNeedsOnboarding, false);
  assert.deepEqual(Object.keys(snapshot.surfaceContract), ['microphone']);
});

test('contract defaults only use provided surfaces when explicitly provided as empty list', () => {
  const snapshot = buildPermissionReadiness.buildPermissionReadinessWithContract(
    {
      microphone: { granted: false },
      accessibility: { granted: false },
      inputMonitoring: { status: 'missing' }
    },
    {
      surfaces: [],
      surfaceOrder: []
    }
  );

  assert.equal(snapshot.surfaces.microphone.status, 'missing');
  assert.equal(snapshot.surfaceOrder.length, 0);
  assert.deepEqual(snapshot.surfaceContract, {});
});
