# Phase 6: 主进程适配

## 目标
使 `index.js` 使用平台抽象层。

## 交付物
修改: `src/main/index.js`

## 实现步骤

### 1. 引入平台模块

```javascript
// src/main/index.js 顶部
const platform = require('./platform');
```

### 2. 修改模块初始化

```javascript
// 原代码
this.audioRecorder = new AudioRecorder({
  sampleRate: 16000,
  channels: 1
});

this.whisperEngine = new WhisperEngine({
  modelPath: modelPath,
  // ...
  whisperBin: this.getWhisperBinPath()
});

this.inputSimulator = new InputSimulator();

// 修改后
this.audioRecorder = platform.getAudioRecorder({
  sampleRate: 16000,
  channels: 1
});

this.whisperEngine = new WhisperEngine({
  modelPath: modelPath,
  // ...
  whisperBin: platform.isWindows
    ? path.join(process.resourcesPath, 'bin', 'whisper-cli.exe')
    : path.join(process.resourcesPath, 'bin', 'whisper-cli')
});

this.inputSimulator = platform.getInputSimulator();
```

### 3. 修改 Whisper 路径获取

```javascript
getWhisperBinPath() {
  const isPackaged = app.isPackaged;

  if (platform.isWindows) {
    return isPackaged
      ? path.join(process.resourcesPath, 'bin', 'whisper-cli.exe')
      : path.join(__dirname, '../../bin/whisper-cli.exe');
  }

  // macOS
  return isPackaged
    ? path.join(process.resourcesPath, 'bin', 'whisper-cli')
    : path.join(__dirname, '../../bin/whisper-cli');
}
```

### 4. Windows 托盘处理

```javascript
// index.js init() 中
if (platform.isWindows) {
  // Windows 使用系统托盘，macOS 使用菜单栏
  this.trayManager = new TrayManager({ useSystemTray: true });
} else {
  this.trayManager = new TrayManager();
}
```

## 验证标准

- [ ] Mac 启动无报错
- [ ] Windows 启动无报错

## 验证命令

```bash
# Mac 测试
npm run dev

# Windows 测试 (需要 Windows 环境)
# 运行打包后的 exe
```

## 依赖前置
- Phase 1-5 完成

## 后续阶段
- Phase 7: 回归测试 (Mac)
