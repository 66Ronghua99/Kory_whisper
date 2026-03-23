/**
 * Canonical shared path helpers for Whisper runtime and model storage.
 */

const os = require('os');
const path = require('path');

const APP_SUPPORT_DIR = '.kory-whisper';

function assertValidModelName(modelName) {
  if (modelName === undefined || modelName === null) {
    throw new TypeError('modelName is required');
  }
}

function flattenHints(values) {
  return values.flat ? values.flat(Infinity) : values;
}

function isWindowsPath(value) {
  return typeof value === 'string' && /^[A-Za-z]:[\\/]/.test(value);
}

function selectPathModule(...hints) {
  for (const hint of flattenHints(hints)) {
    if (typeof hint !== 'string' || hint.length === 0) {
      continue;
    }
    if (hint.includes('\\') || isWindowsPath(hint)) {
      return path.win32;
    }
    if (hint.includes('/')) {
      return path.posix;
    }
  }
  return path;
}

function joinPathSegments(segments, hints = segments) {
  const pathModule = selectPathModule(hints);
  const filtered = segments.filter((segment) => segment !== undefined && segment !== null && segment !== '');
  return pathModule.join(...filtered);
}

function splitRelativePath(relativePath) {
  return String(relativePath || '')
    .split('/')
    .filter(Boolean);
}

function getSharedAppDir(options = {}) {
  const homeDir = options.homeDir || (options.os || os).homedir();
  return joinPathSegments([homeDir, APP_SUPPORT_DIR], [homeDir]);
}

function getSharedModelsDir(options = {}) {
  return joinPathSegments([getSharedAppDir(options), 'models'], [options.homeDir]);
}

function getSharedModelPath(modelName, options = {}) {
  assertValidModelName(modelName);
  return joinPathSegments([getSharedModelsDir(options), modelName], [options.homeDir, modelName]);
}

function getBundledModelPath(modelName, options = {}) {
  if (!options.isPackaged || !options.resourcesPath) {
    return null;
  }

  assertValidModelName(modelName);

  return joinPathSegments(
    [options.resourcesPath, 'models', modelName],
    [options.resourcesPath, modelName]
  );
}

module.exports = {
  APP_SUPPORT_DIR,
  getBundledModelPath,
  getSharedAppDir,
  getSharedModelPath,
  getSharedModelsDir,
  joinPathSegments,
  selectPathModule,
  splitRelativePath
};
