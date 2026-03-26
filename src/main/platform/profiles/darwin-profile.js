const SUPPORTED_SOUND_NAMES = Object.freeze([
  'Tink',
  'Glass',
  'Pop',
  'Ping',
  'Hero'
]);

const SHORTCUT_OPTIONS = Object.freeze([
  Object.freeze({ key: 'RIGHT COMMAND', label: 'Right Command' }),
  Object.freeze({ key: 'LEFT COMMAND', label: 'Left Command' }),
  Object.freeze({ key: 'RIGHT OPTION', label: 'Right Option' }),
  Object.freeze({ key: 'LEFT OPTION', label: 'Left Option' }),
  Object.freeze({ key: 'RIGHT CONTROL', label: 'Right Control' }),
  Object.freeze({ key: 'LEFT CONTROL', label: 'Left Control' }),
  Object.freeze({ key: 'F13', label: 'F13' }),
  Object.freeze({ key: 'F14', label: 'F14' }),
  Object.freeze({ key: 'F15', label: 'F15' })
]);

const PERMISSION_UI_SURFACES = Object.freeze([
  {
    key: 'microphone',
    label: 'Microphone',
    onboardingLabel: '麦克风',
    settingsTarget: 'microphone',
    why: '用于录制你说的话，并把声音送进转写流程。',
    missingReason: 'required-for-recording',
    missingCta: 'request-or-open-settings',
    menuLabel: '麦克风',
    actionLabel: '打开麦克风设置'
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    onboardingLabel: '辅助功能',
    settingsTarget: 'accessibility',
    why: '用于把转写结果输入到当前应用，并维持快捷键控制。',
    missingReason: 'required-for-text-injection',
    missingCta: 'open-settings-and-recheck',
    menuLabel: '辅助功能',
    actionLabel: '打开辅助功能设置'
  },
  {
    key: 'inputMonitoring',
    label: 'Input Monitoring',
    onboardingLabel: '输入监控',
    settingsTarget: 'input-monitoring',
    why: '用于监听全局快捷键，让你在任意应用里启动语音输入。',
    missingReason: 'required-for-global-hotkey',
    missingCta: 'open-settings-and-recheck',
    menuLabel: '输入监控',
    actionLabel: '打开输入监控设置'
  }
]);

module.exports = Object.freeze({
  id: 'darwin',
  displayName: 'macOS',
  configDefaults: Object.freeze({
    input: Object.freeze({
      method: 'applescript'
    })
  }),
  capabilities: Object.freeze({
    audioRecording: Object.freeze({
      supported: true,
      implementation: 'sox-rec'
    }),
    textInjection: Object.freeze({
      supported: true,
      modes: Object.freeze(['clipboard', 'applescript'])
    }),
    audioCues: Object.freeze({
      supported: true,
      supportedSoundNames: SUPPORTED_SOUND_NAMES,
      defaultRecordingStartSound: 'Tink',
      defaultOutputReadySound: 'Glass'
    }),
    permissions: Object.freeze({
      supported: true,
      surfaces: Object.freeze(['microphone', 'accessibility', 'input-monitoring'])
    })
  }),
  uiContract: Object.freeze({
    shortcut: Object.freeze({
      defaultKey: 'RIGHT COMMAND',
      options: SHORTCUT_OPTIONS
    }),
    audioCues: Object.freeze({
      supported: true,
      supportedSoundNames: SUPPORTED_SOUND_NAMES,
      defaultRecordingStartSound: 'Tink',
      defaultOutputReadySound: 'Glass',
      availabilityNote: 'macOS plays the selected system alert sounds.'
    }),
    settings: Object.freeze({
      modelStorageHint: 'Speech models live in the shared user store under ~/.kory-whisper/models/.'
    }),
    permission: Object.freeze({
      surfaces: PERMISSION_UI_SURFACES,
      surfaceOrder: Object.freeze(['microphone', 'accessibility', 'inputMonitoring']),
      menu: Object.freeze({
        blockedHeader: '语音输入在完成设置前不可用',
        blockedHint: '请完成权限设置后再继续',
        openPermissionSetupLabel: 'Open Permission Setup',
        recheckPermissionsLabel: 'Re-check Permissions'
      }),
      onboarding: Object.freeze({
        title: 'Kory Whisper 权限引导',
        lead: '完成麦克风、辅助功能和输入监控后，语音输入才会进入可用状态。',
        statusLabels: Object.freeze({
          granted: '已授权',
          missing: '未授权',
          unknown: '状态未知',
          unsupported: '系统不支持'
        })
      })
    })
  })
});
