# Phase 5: electron-builder 配置

## 目标
配置 Windows 构建目标。

## 交付物
修改: `package.json`

## 实现步骤

### 1. 添加 Windows 构建配置

```json
{
  "build": {
    "mac": {
      "category": "public.app-category.productivity",
      "target": [
        {
          "target": "dmg",
          "arch": ["arm64"]
        }
      ]
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Kory Whisper"
    },
    "extraResources": [
      {
        "from": "bin",
        "to": "bin",
        "filter": ["**/*"]
      },
      {
        "from": "models",
        "to": "models",
        "filter": ["*.bin"]
      },
      {
        "from": "resources/ffmpeg/win-x64",
        "to": "ffmpeg",
        "filter": ["*.exe"]
      }
    ]
  }
}
```

### 2. 添加 ffmpeg 到项目

```bash
# 下载 ffmpeg Windows static build
# https://github.com/BtbN/FFmpeg-Builds/releases

mkdir -p resources/ffmpeg/win-x64
# 下载 ffmpeg-master-latest-win64-gpl.zip
# 解压后复制 ffmpeg.exe 到 resources/ffmpeg/win-x64/
```

## 验证标准

- [ ] `package.json` 包含 `win` 配置
- [ ] `npm run build -- --win` 能成功执行

## 验证命令

```bash
# 构建 Windows 版本 (需要 macOS 或 Linux)
npm run build -- --win

# 检查输出
ls -la dist/
```

## 依赖前置
- Phase 4 完成

## 后续阶段
- Phase 6: 主进程适配
