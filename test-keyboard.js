/**
 * Shortcut listener diagnostics for the active uiohook-based implementation.
 */

const { uIOhook, UiohookKey } = require('uiohook-napi');

function runSelfTest() {
  console.log('Self-test OK: uiohook-napi loaded');
  console.log('MetaRight keycode:', UiohookKey.MetaRight);
}

function formatKeyEvent(type, event) {
  return {
    type,
    keycode: event.keycode,
    rawcode: event.rawcode,
    altKey: Boolean(event.altKey),
    ctrlKey: Boolean(event.ctrlKey),
    metaKey: Boolean(event.metaKey),
    shiftKey: Boolean(event.shiftKey)
  };
}

function startKeyboardDiagnostics() {
  console.log('Starting keyboard listener test with uiohook-napi...');
  console.log('Press keys to inspect events (Ctrl+C to exit)');

  uIOhook.on('keydown', (event) => {
    console.log('Key down:', formatKeyEvent('keydown', event));
  });

  uIOhook.on('keyup', (event) => {
    console.log('Key up:', formatKeyEvent('keyup', event));
  });

  uIOhook.start();
}

function stopKeyboardDiagnostics() {
  try {
    uIOhook.stop();
  } catch (error) {
    console.error('Failed to stop keyboard listener cleanly:', error);
  }
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
} else if (process.env.NODE_TEST_CONTEXT) {
  console.log('Skipping interactive keyboard diagnostics during node --test');
} else {
  process.on('SIGINT', () => {
    stopKeyboardDiagnostics();
    process.exit(0);
  });

  startKeyboardDiagnostics();
}
