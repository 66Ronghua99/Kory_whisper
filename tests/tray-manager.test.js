const test = require('node:test');
const assert = require('node:assert/strict');

const TrayManager = require('../src/main/tray-manager.js');

test('recording state clears any pending success reset timer', () => {
  const manager = new TrayManager();
  manager.tray = {
    setTitle() {},
    setToolTip() {},
    setContextMenu() {}
  };
  manager.updateContextMenu = () => {};

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
