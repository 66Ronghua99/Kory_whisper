/**
 * Platform abstraction layer
 * Deps: none
 * Used By: index.js
 * Last Updated: 2026-03-05
 */

const platform = process.platform;

const isMac = platform === 'darwin';
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';

let audioRecorderModule = null;
let inputSimulatorModule = null;

// Lazy load platform-specific modules
function getAudioRecorderModule() {
  if (!audioRecorderModule) {
    if (isWindows) {
      audioRecorderModule = require('./audio-win32.js');
    } else {
      audioRecorderModule = require('./audio-darwin.js');
    }
  }
  return audioRecorderModule;
}

function getInputSimulatorModule() {
  if (!inputSimulatorModule) {
    if (isWindows) {
      inputSimulatorModule = require('./input-win32.js');
    } else {
      inputSimulatorModule = require('./input-darwin.js');
    }
  }
  return inputSimulatorModule;
}

module.exports = {
  isMac,
  isWindows,
  isLinux,
  platform,

  getAudioRecorder(options) {
    const RecorderClass = getAudioRecorderModule();
    return new RecorderClass(options);
  },

  getInputSimulator(options) {
    const SimulatorClass = getInputSimulatorModule();
    return new SimulatorClass(options);
  }
};
