const SHORTCUT_OPTIONS = Object.freeze([
  Object.freeze({ key: 'RIGHT CONTROL', label: 'Right Control' }),
  Object.freeze({ key: 'LEFT CONTROL', label: 'Left Control' }),
  Object.freeze({ key: 'F13', label: 'F13' }),
  Object.freeze({ key: 'F14', label: 'F14' }),
  Object.freeze({ key: 'F15', label: 'F15' })
]);

module.exports = Object.freeze({
  id: 'win32',
  displayName: 'Windows',
  configDefaults: Object.freeze({
    input: Object.freeze({
      method: 'clipboard'
    })
  }),
  capabilities: Object.freeze({
    audioRecording: Object.freeze({
      supported: true,
      implementation: 'ffmpeg-dshow'
    }),
    textInjection: Object.freeze({
      supported: true,
      modes: Object.freeze(['clipboard', 'powershell-sendkeys'])
    }),
    audioCues: Object.freeze({
      supported: true,
      implementation: 'win32-system-sounds',
      defaultRecordingStartSound: 'Asterisk',
      defaultOutputReadySound: 'Exclamation'
    }),
    permissions: Object.freeze({
      supported: false,
      surfaces: Object.freeze([])
    })
  }),
  uiContract: Object.freeze({
    shortcut: Object.freeze({
      defaultKey: 'RIGHT CONTROL',
      options: SHORTCUT_OPTIONS
    }),
    audioCues: Object.freeze({
      supported: true,
      supportedSoundNames: Object.freeze([]),
      defaultRecordingStartSound: 'Asterisk',
      defaultOutputReadySound: 'Exclamation',
      availabilityNote: 'Windows uses fixed native system sounds, so the cue picker stays hidden.'
    }),
    settings: Object.freeze({
      modelStorageHint: 'Speech models live in the shared user store under ~/.kory-whisper/models/.'
    }),
    permission: Object.freeze({
      surfaces: Object.freeze([]),
      surfaceOrder: Object.freeze([]),
      menu: Object.freeze({
        blockedHeader: '当前平台不需要手动配置额外权限',
        blockedHint: '可直接开始语音转写。',
        openPermissionSetupLabel: 'Open Permission Setup',
        recheckPermissionsLabel: 'Re-check Permissions'
      }),
      onboarding: Object.freeze({
        title: 'Kory Whisper 权限说明',
        lead: '当前平台由系统权限策略托管，不需要手动打开麦克风/辅助功能设置。',
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
