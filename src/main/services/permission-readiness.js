const SURFACE_TARGETS = Object.freeze({
  microphone: 'microphone',
  accessibility: 'accessibility',
  inputMonitoring: 'input-monitoring'
});

function createSurface(status, settingsTarget, reason = null, cta = null) {
  return {
    status,
    reason,
    cta,
    settingsTarget
  };
}

function getRawSurface(rawFacts, surfaceName) {
  if (!rawFacts || typeof rawFacts !== 'object') {
    return {};
  }

  if (rawFacts.surfaces && rawFacts.surfaces[surfaceName]) {
    return rawFacts.surfaces[surfaceName];
  }

  return rawFacts[surfaceName] || {};
}

function normalizeSurface(rawFacts, surfaceName) {
  const surface = getRawSurface(rawFacts, surfaceName);
  const settingsTarget = SURFACE_TARGETS[surfaceName];

  if (surfaceName === 'microphone') {
    if (rawFacts.permissionsSupported === false || rawFacts.supported === false) {
      return createSurface('unsupported', settingsTarget);
    }

    const granted = surface.granted === true || rawFacts.microphoneGranted === true;
    const canRequest = surface.canRequest !== false && rawFacts.microphoneCanRequest !== false;

    return granted
      ? createSurface('granted', settingsTarget)
      : createSurface('missing', settingsTarget, 'required-for-recording', canRequest ? 'request-or-open-settings' : 'open-settings-and-recheck');
  }

  if (surfaceName === 'accessibility') {
    if (rawFacts.permissionsSupported === false || rawFacts.supported === false) {
      return createSurface('unsupported', settingsTarget);
    }

    const granted = surface.granted === true || rawFacts.accessibilityEnabled === true;

    return granted
      ? createSurface('granted', settingsTarget)
      : createSurface('missing', settingsTarget, 'required-for-text-injection', 'open-settings-and-recheck');
  }

  if (rawFacts.permissionsSupported === false || rawFacts.supported === false) {
    return createSurface('unsupported', settingsTarget);
  }

  const status = surface.status || rawFacts.inputMonitoringStatus || (surface.granted === true ? 'granted' : surface.granted === false ? 'missing' : 'unknown');

  return status === 'granted'
    ? createSurface('granted', settingsTarget)
    : createSurface(status, settingsTarget, 'required-for-global-hotkey', 'open-settings-and-recheck');
}

function buildPermissionReadiness(rawFacts = {}) {
  const surfaces = Object.freeze({
    microphone: normalizeSurface(rawFacts, 'microphone'),
    accessibility: normalizeSurface(rawFacts, 'accessibility'),
    inputMonitoring: normalizeSurface(rawFacts, 'inputMonitoring')
  });
  const isReady = Object.values(surfaces).every((surface) => surface.status === 'granted' || surface.status === 'unsupported');
  const firstRunNeedsOnboarding = typeof rawFacts.firstRunNeedsOnboarding === 'boolean'
    ? rawFacts.firstRunNeedsOnboarding
    : !isReady;

  return {
    isReady,
    firstRunNeedsOnboarding,
    refreshedAt: rawFacts.refreshedAt || new Date().toISOString(),
    surfaces
  };
}

module.exports = buildPermissionReadiness;
