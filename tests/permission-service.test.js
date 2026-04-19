const test = require('node:test');
const assert = require('node:assert/strict');

const PermissionService = require('../src/main/services/permission-service.js');
const PermissionGatewayDarwin = require('../src/main/platform/adapters/darwin/permission-gateway.js');
const PermissionGatewayWin32 = require('../src/main/platform/adapters/win32/permission-gateway.js');

test('darwin permission gateway routes input monitoring to Privacy_ListenEvent', () => {
  const openSystemPreferencesCalls = [];
  const permissionGateway = new PermissionGatewayDarwin({
    systemPreferences: {
      getMediaAccessStatus: () => 'granted',
      isTrustedAccessibilityClient: () => true,
      openSystemPreferences: (...args) => {
        openSystemPreferencesCalls.push(args);
      }
    }
  });

  permissionGateway.openSettings('input-monitoring');

  assert.deepEqual(openSystemPreferencesCalls, [['security', 'Privacy_ListenEvent']]);
});

test('darwin permission gateway prefers x-apple deep links for microphone and input monitoring', async () => {
  const openExternalCalls = [];
  const openSystemPreferencesCalls = [];
  const permissionGateway = new PermissionGatewayDarwin({
    shell: {
      openExternal: async (url) => {
        openExternalCalls.push(url);
      }
    },
    systemPreferences: {
      getMediaAccessStatus: () => 'granted',
      isTrustedAccessibilityClient: () => true,
      openSystemPreferences: (...args) => {
        openSystemPreferencesCalls.push(args);
      }
    }
  });

  await permissionGateway.openSettings('microphone');
  await permissionGateway.openSettings('input-monitoring');

  assert.deepEqual(openExternalCalls, [
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'
  ]);
  assert.deepEqual(openSystemPreferencesCalls, []);
});

test('darwin permission gateway falls back to openSystemPreferences when deep linking fails', async () => {
  const openExternalCalls = [];
  const openSystemPreferencesCalls = [];
  const permissionGateway = new PermissionGatewayDarwin({
    shell: {
      openExternal: async (url) => {
        openExternalCalls.push(url);
        throw new Error('deep link failed');
      }
    },
    systemPreferences: {
      getMediaAccessStatus: () => 'granted',
      isTrustedAccessibilityClient: () => true,
      openSystemPreferences: (...args) => {
        openSystemPreferencesCalls.push(args);
      }
    }
  });

  await permissionGateway.openSettings('microphone');

  assert.deepEqual(openExternalCalls, [
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  ]);
  assert.deepEqual(openSystemPreferencesCalls, [['security', 'Privacy_Microphone']]);
});

test('darwin permission gateway returns a three-surface payload shape', async () => {
  const permissionGateway = new PermissionGatewayDarwin({
    systemPreferences: {
      getMediaAccessStatus: () => 'granted',
      isTrustedAccessibilityClient: () => true,
      askForMediaAccess: async () => true,
      openSystemPreferences: () => {}
    }
  });

  const snapshot = await permissionGateway.check();

  assert.deepEqual(Object.keys(snapshot), ['surfaces']);
  assert.deepEqual(Object.keys(snapshot.surfaces), ['microphone', 'accessibility', 'inputMonitoring']);
  assert.equal(snapshot.surfaces.microphone.granted, true);
  assert.equal(snapshot.surfaces.accessibility.granted, true);
  assert.equal(snapshot.surfaces.inputMonitoring.status, 'unknown');
});

test('permission service exposes readiness snapshot from gateway state', async () => {
  const permissionGateway = {
    check: async () => ({
      microphone: { granted: false, canRequest: true },
      accessibility: { granted: true },
      inputMonitoring: { status: 'unknown' }
    })
  };
  const permissionService = new PermissionService({
    permissionGateway
  });

  const snapshot = await permissionService.getReadiness();

  assert.equal(snapshot.isReady, false);
  assert.equal(snapshot.surfaces.inputMonitoring.status, 'unknown');
  assert.equal(snapshot.surfaces.accessibility.status, 'granted');
});

test('permission service startup uses the gateway ensure path before snapshotting', async () => {
  const callOrder = [];
  const permissionGateway = {
    ensure: async () => {
      callOrder.push('ensure');
      return {
        surfaces: {
          microphone: { granted: true, canRequest: true },
          accessibility: { granted: true },
          inputMonitoring: { status: 'unknown' }
        }
      };
    },
    check: async () => {
      callOrder.push('check');
      return {
        surfaces: {
          microphone: { granted: false, canRequest: true },
          accessibility: { granted: true },
          inputMonitoring: { status: 'unknown' }
        }
      };
    }
  };
  const permissionService = new PermissionService({
    permissionGateway
  });

  const snapshot = await permissionService.ensureStartupPermissions();

  assert.deepEqual(callOrder, ['ensure']);
  assert.equal(snapshot.surfaces.microphone.status, 'granted');
});

test('permission service re-check keeps the three surfaces distinct', async () => {
  const permissionGateway = {
    check: async () => ({
      microphone: { granted: true, canRequest: false },
      accessibility: { granted: true },
      inputMonitoring: { status: 'unknown' }
    })
  };
  const permissionService = new PermissionService({
    permissionGateway
  });

  const snapshot = await permissionService.recheckReadiness();

  assert.deepEqual(Object.keys(snapshot.surfaces), ['microphone', 'accessibility', 'inputMonitoring']);
  assert.equal(snapshot.surfaces.microphone.status, 'granted');
  assert.equal(snapshot.surfaces.inputMonitoring.status, 'unknown');
});

test('permission service keeps the input-monitoring button wired to the gateway surface', async () => {
  const openSettingsCalls = [];
  const permissionService = new PermissionService({
    permissionGateway: {
      openSettings: (surface) => {
        openSettingsCalls.push(surface);
      }
    },
    dialog: {
      showMessageBox: async () => ({ response: 1 })
    }
  });

  await permissionService.showAccessibilityWarning();

  assert.deepEqual(openSettingsCalls, ['input-monitoring']);
});

test('permission service applies runtime overrides on top of gateway readiness', async () => {
  const permissionService = new PermissionService({
    permissionGateway: {
      check: async () => ({
        surfaces: {
          microphone: { granted: true, canRequest: true },
          accessibility: { granted: true },
          inputMonitoring: { status: 'unknown' }
        }
      })
    }
  });

  permissionService.setRuntimeSurfaceStatus('inputMonitoring', 'granted');
  const snapshot = await permissionService.getReadiness();

  assert.equal(snapshot.isReady, true);
  assert.equal(snapshot.surfaces.inputMonitoring.status, 'granted');
});

test('permission service applies platform contract metadata while building readiness', async () => {
  const permissionService = new PermissionService({
    permissionGateway: {
      check: async () => ({
        microphone: { granted: false, canRequest: false },
        accessibility: { granted: true },
        inputMonitoring: { status: 'granted' }
      })
    },
    permissionContract: {
      permission: {
        surfaces: [
          {
            key: 'microphone',
            label: 'Microphone',
            onboardingLabel: 'Microphone',
            menuLabel: 'Microphone',
            actionLabel: 'Open microphone settings'
          }
        ],
        surfaceOrder: ['microphone']
      }
    }
  });

  const snapshot = await permissionService.getReadiness();

  assert.equal(snapshot.isReady, false);
  assert.deepEqual(snapshot.surfaceOrder, ['microphone']);
  assert.equal(snapshot.surfaces.microphone.status, 'missing');
  assert.equal(snapshot.surfaces.microphone.settingsTarget, 'microphone');
  assert.equal(snapshot.surfaces.accessibility.status, 'granted');
});

test('win32 permission gateway reports microphone guidance surfaces when access is blocked', async () => {
  const openExternalCalls = [];
  const permissionGateway = new PermissionGatewayWin32({
    shell: {
      openExternal(uri) {
        openExternalCalls.push(uri);
      }
    },
    systemPreferences: {
      getMediaAccessStatus() {
        return 'denied';
      }
    }
  });

  const state = await permissionGateway.check();

  assert.equal(state.microphoneGranted, false);
  assert.deepEqual(permissionGateway.getGuidanceSurfaces(state), ['microphone']);
  assert.deepEqual(permissionGateway.getMicrophoneGuidance(state), {
    surface: 'microphone',
    title: 'Enable microphone access',
    detail: 'Open Windows microphone privacy settings.',
    settingsUri: 'ms-settings:privacy-microphone'
  });
  assert.equal(permissionGateway.openSettings('microphone'), 'ms-settings:privacy-microphone');
  assert.deepEqual(openExternalCalls, ['ms-settings:privacy-microphone']);
});

test('win32 permission service treats an empty platform permission contract as ready', async () => {
  const showMessageBoxCalls = [];
  const permissionService = new PermissionService({
    permissionGateway: {
      ensure: async () => ({
        microphoneGranted: true,
        accessibilityEnabled: true
      }),
      check: async () => ({
        microphoneGranted: true,
        accessibilityEnabled: true
      })
    },
    permissionContract: {
      permission: {
        surfaces: [],
        surfaceOrder: []
      }
    },
    dialog: {
      async showMessageBox(options) {
        showMessageBoxCalls.push(options);
        return { response: 0 };
      }
    }
  });

  const state = await permissionService.ensureStartupPermissions();

  assert.equal(state.isReady, true);
  assert.deepEqual(state.surfaceOrder, []);
  assert.deepEqual(showMessageBoxCalls, []);
});
