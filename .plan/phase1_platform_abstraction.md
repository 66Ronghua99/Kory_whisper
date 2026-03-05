# Phase 1: 平台抽象层

## 目标
创建跨平台模块抽象，使核心平台实现逻辑与解耦。

## 交付物

```
src/main/platform/
├── index.js           # 平台检测与工厂函数
├── audio-darwin.js   # macOS sox 录制实现
├── audio-win32.js    # Windows ffmpeg 录制实现
├── input-darwin.js   # macOS 输入模拟实现
└── input-win32.js    # Windows 输入模拟实现
```

## 实现代码

### src/main/platform/index.js

```javascript
/**
 * Platform abstraction layer
 * Deps: none
 * Last Updated: 2026-03-05
 */

const platform = process.platform;

const isMac = platform === 'darwin';
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';

module.exports = {
  isMac,
  isWindows,
  isLinux,
  platform,

  getAudioRecorder: (options) => {
    if (isWindows) {
      return require('./audio-win32.js')(options);
    }
    return require('./audio-darwin.js')(options);
  },

  getInputSimulator: (options) => {
    if (isWindows) {
      return require('./input-win32.js')(options);
    }
    return require('./input-darwin.js')(options);
  }
};
```

### src/main/platform/audio-darwin.js

```javascript
/**
 * macOS audio recorder using sox
 * Deps: child_process, fs, path, os
 * Last Updated: 2026-03-05
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = class AudioRecorderDarwin {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.channels = options.channels || 1;
    this.device = options.device || null;
    this.soxProcess = null;
    this.outputPath = null;
  }

  // 复用现有 audio-recorder.js 的 sox 逻辑
  // ... (从现有代码移植)
};
```

### src/main/platform/audio-win32.js

```javascript
/**
 * Windows audio recorder using ffmpeg
 * Deps: child_process, fs, path, os
 * Last Updated: 2026-03-05
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = class AudioRecorderWin32 {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.channels = options.channels || 1;
    this.device = options.device || null;
    this.ffmpegProcess = null;
    this.outputPath = null;
  }

  async start() {
    // TODO: 实现 ffmpeg 录制逻辑
  }

  async stop() {
    // TODO: 实现停止逻辑
  }
};
```

### src/main/platform/input-darwin.js

```javascript
/**
 * macOS input simulator using AppleScript
 * Deps: child_process, electron
 * Last Updated: 2026-03-05
 */

const { exec } = require('child_process');
const { clipboard } = require('electron');

module.exports = class InputSimulatorDarwin {
  constructor(options = {}) {
    this.appendSpace = options.appendSpace !== false;
  }

  async typeText(text) {
    // 复用现有 input-simulator.js 的 AppleScript 逻辑
    // ... (从现有代码移植)
  }
};
```

### src/main/platform/input-win32.js

```javascript
/**
 * Windows input simulator using PowerShell SendKeys
 * Deps: child_process, electron
 * Last Updated: 2026-03-05
 */

const { exec } = require('child_process');
const { clipboard } = require('electron');

module.exports = class InputSimulatorWin32 {
  constructor(options = {}) {
    this.appendSpace = options.appendSpace !== false;
  }

  async typeText(text) {
    // TODO: 实现 Windows 输入逻辑
    // 方案: 剪贴板 + Ctrl+V
  }
};
```

## 验证标准

- [x] `src/main/platform/index.js` 存在
- [x] `src/main/platform/audio-darwin.js` 存在
- [x] `src/main/platform/audio-win32.js` 存在
- [x] `src/main/platform/input-darwin.js` 存在
- [x] `src/main/platform/input-win32.js` 存在
- [x] 模块加载验证通过

## 验证命令

```bash
node -e "
const p = require('./src/main/platform');
console.log('isMac:', p.isMac);
console.log('isWindows:', p.isWindows);
console.log('audio module:', typeof p.getAudioRecorder);
console.log('input module:', typeof p.getInputSimulator);
"
```

## 依赖前置
- 无

## 后续阶段
- Phase 2: 音频录制改造
