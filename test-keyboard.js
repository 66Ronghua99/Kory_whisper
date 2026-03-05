/**
 * 测试键盘监听是否工作
 */
const { GlobalKeyboardListener } = require('node-global-key-listener');

console.log('Starting keyboard listener test...');
console.log('Press any key (Ctrl+C to exit)');

const keyboard = new GlobalKeyboardListener();

keyboard.addListener((event, down) => {
  console.log('Key event:', {
    name: event.name,
    state: event.state,
    down: down
  });
  return false;
});

// 保持进程运行
setInterval(() => {}, 1000);
