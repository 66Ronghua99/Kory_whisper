const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

const ShortcutManager = require('../src/main/shortcut-manager.js');

function createHook() {
  const hook = new EventEmitter();
  hook.startCalls = 0;
  hook.stopCalls = 0;
  hook.start = () => {
    hook.startCalls += 1;
  };
  hook.stop = () => {
    hook.stopCalls += 1;
  };
  return hook;
}

function createKeyTable() {
  return {
    Meta: 10,
    MetaRight: 11,
    Alt: 12,
    AltRight: 13,
    Ctrl: 14,
    CtrlRight: 15,
    Shift: 16,
    ShiftRight: 17,
    F13: 18,
    F14: 19,
    F15: 20,
    F16: 21,
    F17: 22,
    F18: 23,
    F19: 24,
    F20: 25,
    F21: 26,
    F22: 27,
    F23: 28,
    F24: 29
  };
}

test('shortcut manager only reacts to the configured key and ignores Meta noise on Windows control shortcuts', async () => {
  const events = [];
  const infoLogs = [];
  const hook = createHook();
  const manager = new ShortcutManager({
    key: 'RIGHT CONTROL',
    longPressDuration: 5,
    uiohook: hook,
    keyTable: createKeyTable(),
    onInfo(message) {
      infoLogs.push(message);
    }
  });

  manager.on('longPressStart', () => {
    events.push('start');
  });
  manager.on('longPressEnd', () => {
    events.push('end');
  });

  await manager.start();

  hook.emit('keydown', { keycode: createKeyTable().MetaRight });
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.deepEqual(events, []);

  hook.emit('keydown', { keycode: createKeyTable().CtrlRight });
  await new Promise((resolve) => setTimeout(resolve, 15));
  hook.emit('keyup', { keycode: createKeyTable().CtrlRight });

  assert.deepEqual(events, ['start', 'end']);
  assert.equal(infoLogs.some((entry) => /Meta/i.test(entry)), false);

  manager.stop();
  assert.equal(hook.startCalls, 1);
  assert.equal(hook.stopCalls, 1);
});

test('shortcut manager swallows logger callback failures instead of crashing the gesture loop', async () => {
  const events = [];
  const hook = createHook();
  const manager = new ShortcutManager({
    key: 'RIGHT CONTROL',
    longPressDuration: 5,
    uiohook: hook,
    keyTable: createKeyTable(),
    onInfo() {
      throw new Error('broken pipe');
    },
    onError() {
      throw new Error('logger failed');
    }
  });

  manager.on('longPressStart', () => {
    events.push('start');
  });
  manager.on('longPressEnd', () => {
    events.push('end');
  });

  await manager.start();
  hook.emit('keydown', { keycode: createKeyTable().CtrlRight });
  await new Promise((resolve) => setTimeout(resolve, 15));
  hook.emit('keyup', { keycode: createKeyTable().CtrlRight });

  assert.deepEqual(events, ['start', 'end']);

  manager.stop();
});
