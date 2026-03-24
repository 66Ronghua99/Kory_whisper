const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const TrayService = require('../src/main/services/tray-service.js');

function loadTrayManager() {
  const originalLoad = Module._load;
  const captured = {
    templates: []
  };

  const electron = {
    Tray: class FakeTray {
      constructor(icon) {
        this.icon = icon;
        this.title = null;
        this.tooltip = null;
        this.menu = null;
        this.handlers = {};
      }

      on(eventName, handler) {
        this.handlers[eventName] = handler;
      }

      setContextMenu(menu) {
        this.menu = menu;
      }

      setTitle(title) {
        this.title = title;
      }

      setToolTip(tooltip) {
        this.tooltip = tooltip;
      }

      destroy() {
        this.destroyed = true;
      }
    },
    Menu: {
      buildFromTemplate(template) {
        captured.templates.push(template);
        return { template };
      }
    },
    nativeImage: {
      createFromPath() {
        return {
          isEmpty() {
            return true;
          },
          getSize() {
            return { width: 0, height: 0 };
          }
        };
      },
      createEmpty() {
        return {
          isEmpty() {
            return false;
          },
          getSize() {
            return { width: 0, height: 0 };
          }
        };
      }
    },
    BrowserWindow: class FakeBrowserWindow {}
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return electron;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[require.resolve('../src/main/tray-manager.js')];
  const TrayManager = require('../src/main/tray-manager.js');
  Module._load = originalLoad;

  return { TrayManager, captured };
}

function createTrayStub() {
  return {
    title: null,
    tooltip: null,
    menu: null,
    setTitle(title) {
      this.title = title;
    },
    setToolTip(tooltip) {
      this.tooltip = tooltip;
    },
    setContextMenu(menu) {
      this.menu = menu;
    }
  };
}

function createBlockedReadinessSnapshot() {
  return {
    isReady: false,
    firstRunNeedsOnboarding: true,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
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
    }
  };
}

function getLabels(template) {
  return template.filter((item) => item && typeof item.label === 'string').map((item) => item.label);
}

function findItem(template, label) {
  return template.find((item) => item && item.label === label);
}

test('tray menu shows not-ready status and missing permissions when readiness is blocked', () => {
  const { TrayManager, captured } = loadTrayManager();
  const manager = new TrayManager();
  manager.tray = createTrayStub();

  manager.setPermissionReadiness(createBlockedReadinessSnapshot());

  const template = captured.templates.at(-1);
  assert.ok(template);

  const labels = getLabels(template);
  assert.equal(labels[0], 'Not Ready');
  assert(labels.includes('语音输入在完成设置前不可用'));
  assert(labels.some((label) => label.includes('Microphone')));
  assert(labels.some((label) => label.includes('Input Monitoring')));
});

test('ready permission state keeps the normal idle tooltip and affordance', () => {
  const { TrayManager } = loadTrayManager();
  const manager = new TrayManager();
  manager.tray = createTrayStub();

  manager.setPermissionReadiness({
    isReady: true,
    firstRunNeedsOnboarding: false,
    refreshedAt: '2026-03-24T00:00:00.000Z',
    surfaces: {
      microphone: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'microphone'
      },
      accessibility: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'accessibility'
      },
      inputMonitoring: {
        status: 'granted',
        reason: null,
        cta: null,
        settingsTarget: 'input-monitoring'
      }
    }
  });

  assert.equal(manager.tray.title, '');
  assert.equal(manager.tray.tooltip, 'Kory Whisper - 长按右 ⌘ 语音输入');
});

test('recording state clears any pending success reset timer', () => {
  const { TrayManager } = loadTrayManager();
  const manager = new TrayManager();
  manager.tray = createTrayStub();

  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const scheduled = new Map();
  let nextId = 1;

  global.setTimeout = (callback) => {
    const id = nextId++;
    scheduled.set(id, callback);
    return id;
  };

  global.clearTimeout = (id) => {
    scheduled.delete(id);
  };

  try {
    manager.showSuccessState();
    assert.equal(manager.currentState, 'success');
    assert.equal(scheduled.size, 1);

    manager.setRecordingState(true);
    assert.equal(manager.currentState, 'recording');
    assert.equal(scheduled.size, 0);
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('tray exposes reopen-onboarding and recheck actions while permissions are incomplete', () => {
  const { TrayManager, captured } = loadTrayManager();
  const manager = new TrayManager();
  manager.tray = createTrayStub();
  manager.setPermissionReadiness(createBlockedReadinessSnapshot());

  const events = [];
  manager.on('open-permission-onboarding', () => events.push('onboarding'));
  manager.on('recheck-permission-readiness', () => events.push('recheck'));
  manager.on('open-permission-settings', (surface) => events.push(`settings:${surface}`));

  const template = captured.templates.at(-1);
  findItem(template, 'Open Permission Setup').click();
  findItem(template, 'Re-check Permissions').click();
  findItem(template, 'Open Microphone Settings').click();

  assert.deepEqual(events, ['onboarding', 'recheck', 'settings:microphone']);
});

test('transient success or error states do not erase the underlying permission-blocked menu model', () => {
  const { TrayManager, captured } = loadTrayManager();
  const manager = new TrayManager();
  manager.tray = createTrayStub();
  manager.setPermissionReadiness(createBlockedReadinessSnapshot());

  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const scheduled = new Map();
  let nextId = 1;

  global.setTimeout = (callback) => {
    const id = nextId++;
    scheduled.set(id, callback);
    return id;
  };

  global.clearTimeout = (id) => {
    scheduled.delete(id);
  };

  try {
    manager.showSuccessState();
    assert.equal(manager.currentState, 'success');
    assert.equal(manager.tray.tooltip, 'Kory Whisper - 已复制到剪贴板，请手动粘贴');

    scheduled.get(1)();

    assert.equal(manager.currentState, 'idle');
    assert.equal(manager.tray.tooltip, 'Kory Whisper - Not Ready');
    assert.equal(getLabels(captured.templates.at(-1))[0], 'Not Ready');

    manager.showErrorState('boom');
    assert.equal(manager.currentState, 'error');
    assert.equal(manager.tray.tooltip, 'Kory Whisper - 出错了');

    scheduled.get(2)();

    assert.equal(manager.currentState, 'idle');
    assert.equal(manager.tray.tooltip, 'Kory Whisper - Not Ready');
    assert.equal(getLabels(captured.templates.at(-1))[0], 'Not Ready');
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('tray service dispose calls destroy when the tray manager exposes it', () => {
  const events = [];
  const trayService = new TrayService({
    trayManager: {
      destroy() {
        events.push('destroy');
      }
    }
  });

  trayService.dispose();

  assert.deepEqual(events, ['destroy']);
});

test('tray service dispose falls back to dispose when destroy is unavailable', () => {
  const events = [];
  const trayService = new TrayService({
    trayManager: {
      dispose() {
        events.push('dispose');
      }
    }
  });

  trayService.dispose();

  assert.deepEqual(events, ['dispose']);
});
