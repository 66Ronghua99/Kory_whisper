/**
 * Shared Whisper model path helpers
 * Deps: os, path
 * Used By: index.js, config-manager.js
 * Last Updated: 2026-03-23
 */

const os = require('os');
const path = require('path');

const APP_SUPPORT_DIR = '.kory-whisper';

function getSharedAppDir(options = {}) {
  return path.join(options.homeDir || os.homedir(), APP_SUPPORT_DIR);
}

function getSharedModelsDir(options = {}) {
  return path.join(getSharedAppDir(options), 'models');
}

function getSharedModelPath(modelName, options = {}) {
  return path.join(getSharedModelsDir(options), modelName);
}

function getBundledModelPath(modelName, options = {}) {
  if (!options.isPackaged || !options.resourcesPath) {
    return null;
  }

  return path.join(options.resourcesPath, 'models', modelName);
}

module.exports = {
  APP_SUPPORT_DIR,
  getSharedAppDir,
  getSharedModelsDir,
  getSharedModelPath,
  getBundledModelPath
};
