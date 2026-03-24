const SURFACE_TARGETS = Object.freeze({
  microphone: 'microphone',
  accessibility: 'accessibility',
  inputMonitoring: 'input-monitoring'
});

const DEFAULT_SURFACE_DEFINITIONS = Object.freeze([
  {
    key: 'microphone',
    label: 'Microphone',
    onboardingLabel: '麦克风',
    settingsTarget: 'microphone',
    missingReason: 'required-for-recording',
    missingCta: 'request-or-open-settings',
    menuLabel: '麦克风',
    why: '用于录制你说的话，并把声音送进转写流程。'
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    onboardingLabel: '辅助功能',
    settingsTarget: 'accessibility',
    missingReason: 'required-for-text-injection',
    missingCta: 'open-settings-and-recheck',
    menuLabel: '辅助功能',
    why: '用于把转写结果输入到当前应用，并维持快捷键控制。'
  },
  {
    key: 'inputMonitoring',
    label: 'Input Monitoring',
    onboardingLabel: '输入监控',
    settingsTarget: 'input-monitoring',
    missingReason: 'required-for-global-hotkey',
    missingCta: 'open-settings-and-recheck',
    menuLabel: '输入监控',
    why: '用于监听全局快捷键，让你在任意应用里启动语音输入。'
  }
]);

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

function createLegacySurfaceContract() {
  return {
    microphone: DEFAULT_SURFACE_DEFINITIONS[0],
    accessibility: DEFAULT_SURFACE_DEFINITIONS[1],
    inputMonitoring: DEFAULT_SURFACE_DEFINITIONS[2]
  };
}

function getContractFromDefinition(permissionContract = {}) {
  const hasExplicitSurfaces = Object.prototype.hasOwnProperty.call(permissionContract, 'surfaces') && Array.isArray(permissionContract.surfaces);
  const contractSurfaces = hasExplicitSurfaces
    ? permissionContract.surfaces
    : DEFAULT_SURFACE_DEFINITIONS;

  const contractMap = {};
  for (const surface of contractSurfaces) {
    if (!surface || typeof surface !== 'object') {
      continue;
    }

    const surfaceKey = surface.key || surface.id;
    if (!surfaceKey) {
      continue;
    }

    contractMap[surfaceKey] = surface;
  }

  const mergedContract = hasExplicitSurfaces
    ? contractMap
    : { ...createLegacySurfaceContract(), ...contractMap };
  const surfaceOrder = Array.isArray(permissionContract.surfaceOrder) && permissionContract.surfaceOrder.length > 0
    ? permissionContract.surfaceOrder
    : Object.keys(mergedContract);

  return {
    surfaceContract: Object.freeze(mergedContract),
    surfaceOrder: Object.freeze(surfaceOrder)
  };
}

function shouldMarkSurfaceUnsupported(rawFacts, surfaceConfig) {
  if (rawFacts.permissionsSupported === false || rawFacts.supported === false) {
    return true;
  }

  return surfaceConfig && surfaceConfig.supported === false;
}

function normalizeSurface(rawFacts, surfaceName, surfaceConfig = {}) {
  const surface = getRawSurface(rawFacts, surfaceName);
  const settingsTarget = SURFACE_TARGETS[surfaceName];
  const missingReason = surfaceConfig.missingReason || `required-for-${surfaceName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  const missingCta = surfaceConfig.missingCta || 'open-settings-and-recheck';
  const normalizedSurfaceConfig = {
    ...surfaceConfig,
    key: surfaceName,
    settingsTarget: surfaceConfig.settingsTarget || settingsTarget
  };

  if (shouldMarkSurfaceUnsupported(rawFacts, normalizedSurfaceConfig)) {
    return createSurface('unsupported', normalizedSurfaceConfig.settingsTarget);
  }

  if (surfaceName === 'microphone') {
    if (rawFacts.permissionsSupported === false || rawFacts.supported === false) {
      return createSurface('unsupported', settingsTarget);
    }

    const granted = surface.granted === true || rawFacts.microphoneGranted === true;
    const canRequest = surface.canRequest !== false && rawFacts.microphoneCanRequest !== false;
    const microphoneCta = canRequest ? missingCta : 'open-settings-and-recheck';

    return granted
      ? createSurface('granted', settingsTarget)
      : createSurface('missing', settingsTarget, missingReason, microphoneCta);
  }

  if (surfaceName === 'accessibility') {
    if (rawFacts.permissionsSupported === false || rawFacts.supported === false) {
      return createSurface('unsupported', settingsTarget);
    }

    const granted = surface.granted === true || rawFacts.accessibilityEnabled === true;

    return granted
      ? createSurface('granted', settingsTarget)
      : createSurface('missing', settingsTarget, missingReason, missingCta);
  }

  if (rawFacts.permissionsSupported === false || rawFacts.supported === false) {
    return createSurface('unsupported', settingsTarget);
  }

  const status = surface.status || rawFacts.inputMonitoringStatus || (surface.granted === true ? 'granted' : surface.granted === false ? 'missing' : 'unknown');
  const fallbackReason = status === 'unknown' ? 'required-for-global-hotkey' : missingReason;

  return status === 'granted'
    ? createSurface('granted', settingsTarget)
    : createSurface(status, settingsTarget, fallbackReason, missingCta);
}

function buildPermissionReadiness(rawFacts = {}) {
  return buildPermissionReadinessWithContract(rawFacts, {});
}

function buildPermissionReadinessWithContract(rawFacts = {}, permissionContract = {}) {
  const contract = getContractFromDefinition(permissionContract);

  const surfaces = Object.freeze({
    microphone: normalizeSurface(rawFacts, 'microphone', contract.surfaceContract.microphone),
    accessibility: normalizeSurface(rawFacts, 'accessibility', contract.surfaceContract.accessibility),
    inputMonitoring: normalizeSurface(rawFacts, 'inputMonitoring', contract.surfaceContract.inputMonitoring)
  });
  const isReady = Object.keys(surfaces)
    .filter((key) => contract.surfaceContract[key])
    .every((key) => surfaces[key].status === 'granted' || surfaces[key].status === 'unsupported');
  const firstRunNeedsOnboarding = typeof rawFacts.firstRunNeedsOnboarding === 'boolean'
    ? rawFacts.firstRunNeedsOnboarding
    : !isReady;

  return {
    isReady,
    firstRunNeedsOnboarding,
    refreshedAt: rawFacts.refreshedAt || new Date().toISOString(),
    surfaces,
    surfaceOrder: contract.surfaceOrder,
    surfaceContract: contract.surfaceContract
  };
}

module.exports = buildPermissionReadiness;
module.exports.buildPermissionReadiness = buildPermissionReadiness;
module.exports.buildPermissionReadinessWithContract = buildPermissionReadinessWithContract;
module.exports.DEFAULT_SURFACE_DEFINITIONS = DEFAULT_SURFACE_DEFINITIONS;
module.exports.getContractFromDefinition = getContractFromDefinition;
