const { listElectronBuilderExtraResources } = require('./src/main/distribution/distribution-manifest');

module.exports = {
  appId: 'com.kory.whisper',
  productName: 'Kory Whisper',
  directories: {
    output: 'dist'
  },
  files: [
    'src/**/*',
    'assets/**/*',
    'node_modules/**/*'
  ],
  asar: false,
  mac: {
    category: 'public.app-category.productivity',
    target: [
      {
        target: 'dmg',
        arch: ['arm64']
      }
    ],
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    hardenedRuntime: false,
    extendInfo: {
      NSMicrophoneUsageDescription: 'Kory Whisper 需要使用麦克风进行语音识别'
    },
    extraResources: listElectronBuilderExtraResources('darwin')
  },
  win: {
    signAndEditExecutable: false,
    extraResources: listElectronBuilderExtraResources('win32')
  }
};
