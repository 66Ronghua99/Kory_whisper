# Phase 3: 输入模拟改造

## 目标
使 `InputSimulator` 支持 Windows (Ctrl+V 粘贴)。

## 交付物
修改: `src/main/platform/input-win32.js`

## 实现要点

### 方案: 剪贴板 + PowerShell SendKeys

```javascript
// src/main/platform/input-win32.js

const { exec } = require('child_process');
const { clipboard } = require('electron');

async pasteText(text) {
  const originalClipboard = clipboard.readText();
  clipboard.writeText(text);

  // 使用 PowerShell SendKeys 模拟 Ctrl+V
  const escapedText = text.replace(/"/g, '\\"');
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("^v")
  `;

  return new Promise((resolve, reject) => {
    exec(`powershell -Command "${psScript}"`, (error) => {
      setTimeout(() => {
        clipboard.writeText(originalClipboard);
      }, 100);

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
```

### 备选方案: node-key-sender

如果 PowerShell SendKeys 不可靠，可以使用 `node-key-sender`:

```bash
npm install node-key-sender --save
```

```javascript
const nks = require('node-key-sender');

async pasteText(text) {
  const originalClipboard = clipboard.readText();
  clipboard.writeText(text);

  await nks.sendKey('control', 'v');

  setTimeout(() => {
    clipboard.writeText(originalClipboard);
  }, 100);
}
```

## 验证标准

- [ ] macOS: 文字成功输入到焦点应用
- [ ] Windows: 文字成功输入到焦点应用

## 验证命令

```bash
# 测试流程
npm run dev

# 1. 打开任意文本输入框
# 2. 按住右 ⌘ 录音
# 3. 说话
# 4. 松开快捷键
# 5. 观察文字是否输入到文本框
```

## 依赖前置
- Phase 1 完成

## 后续阶段
- Phase 4: Whisper Windows 二进制
