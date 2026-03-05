# Phase 2: 音频录制改造

## 目标
使 `AudioRecorder` 支持 Windows (ffmpeg)。

## 交付物
修改: `src/main/platform/audio-win32.js`

## 实现要点

### Windows ffmpeg 录制命令

```bash
# 查看可用音频设备
ffmpeg -list_devices true -f dshow -i dummy

# 录制麦克风
ffmpeg -f dshow -i audio="麦克风名称" -ar 16000 -ac 1 -acodec pcm_s16le output.wav
```

### 代码实现

```javascript
// src/main/platform/audio-win32.js

resolveFfmpegBinary() {
  // 1. 检查打包后的 ffmpeg (extraResources)
  const packagedPath = path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe');
  if (fs.existsSync(packagedPath)) {
    return packagedPath;
  }

  // 2. 检查系统 PATH 中的 ffmpeg
  // ... 现有逻辑
}

buildFfmpegArgs() {
  return [
    '-f', 'dshow',
    '-i', `audio=${this.device || 'default'}`,
    '-ar', this.sampleRate.toString(),
    '-ac', this.channels.toString(),
    '-acodec', 'pcm_s16le',
    '-y', // 覆盖输出文件
    this.outputPath
  ];
}

async start() {
  this.outputPath = path.join(os.tmpdir(), `kory-whisper-${Date.now()}.wav`);
  const ffmpegBinary = this.resolveFfmpegBinary();

  if (!ffmpegBinary) {
    throw new Error('未找到 ffmpeg。请确保已安装 ffmpeg。');
  }

  return new Promise((resolve, reject) => {
    const args = this.buildFfmpegArgs();
    this.ffmpegProcess = spawn(ffmpegBinary, args, {
      stdio: ['ignore', 'ignore', 'pipe']
    });

    // ... 错误处理和启动验证
  });
}

async stop() {
  if (!this.ffmpegProcess) {
    throw new Error('Not recording');
  }

  this.ffmpegProcess.kill('SIGTERM');
  // ... 等待进程退出
}
```

## 验证标准

- [ ] macOS: `rec` 命令可用，录音正常
- [ ] Windows: `ffmpeg` 命令可用，录音正常
- [ ] 输出 WAV 格式一致 (16kHz, mono, 16bit)

## 验证命令

```bash
# macOS 测试
npm run dev
# 长按快捷键，观察日志输出 [Audio] Starting recording with sox...

# Windows 测试 (需要 Windows 环境)
# 长按快捷键，观察日志输出 [Audio] Starting recording with ffmpeg...
```

## 依赖前置
- Phase 1 完成

## 后续阶段
- Phase 3: 输入模拟改造
