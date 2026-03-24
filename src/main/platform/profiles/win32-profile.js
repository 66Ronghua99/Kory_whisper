module.exports = Object.freeze({
  id: 'win32',
  displayName: 'Windows',
  configDefaults: Object.freeze({
    shortcut: Object.freeze({
      key: 'RIGHT CONTROL'
    }),
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
      supported: false,
      implementation: 'noop',
      defaultRecordingStartSound: 'Tink',
      defaultOutputReadySound: 'Glass'
    }),
    permissions: Object.freeze({
      supported: false,
      surfaces: Object.freeze([])
    })
  }),
  uiContract: Object.freeze({
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
