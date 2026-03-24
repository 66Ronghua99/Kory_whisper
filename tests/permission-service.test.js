const test = require('node:test');
const assert = require('node:assert/strict');

const PermissionService = require('../src/main/services/permission-service.js');
const PermissionGatewayDarwin = require('../src/main/platform/adapters/darwin/permission-gateway.js');

test('darwin permission gateway routes input monitoring to Privacy_ListenEvent', () => {
  const openSystemPreferencesCalls = [];
  const permissionGateway = new PermissionGatewayDarwin({
    systemPreferences: {
      openSystemPreferences: (...args) => {
        openSystemPreferencesCalls.push(args);
      }
    }
  });

  permissionGateway.openSettings('input-monitoring');

  assert.deepEqual(openSystemPreferencesCalls, [['security', 'Privacy_ListenEvent']]);
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
