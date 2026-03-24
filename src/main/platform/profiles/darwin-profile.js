const SUPPORTED_SOUND_NAMES = Object.freeze([
  'Tink',
  'Glass',
  'Pop',
  'Ping',
  'Hero'
]);

module.exports = Object.freeze({
  id: 'darwin',
  displayName: 'macOS',
  configDefaults: Object.freeze({
    shortcut: Object.freeze({
      key: 'RIGHT COMMAND'
    }),
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
  })
});
