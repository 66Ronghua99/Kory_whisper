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
  })
});
