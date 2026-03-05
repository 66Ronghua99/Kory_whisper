const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 创建 16x16 的模板图标（菜单栏用）
function createTemplateIcon() {
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');
  
  // 清除画布
  ctx.clearRect(0, 0, 16, 16);
  
  // 绘制麦克风图标（白色，用于模板）
  ctx.fillStyle = '#FFFFFF';
  
  // 麦克风头部（圆形）
  ctx.beginPath();
  ctx.arc(8, 6, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // 麦克风身体（梯形）
  ctx.beginPath();
  ctx.moveTo(5, 8);
  ctx.lineTo(11, 8);
  ctx.lineTo(10, 12);
  ctx.lineTo(6, 12);
  ctx.closePath();
  ctx.fill();
  
  // 麦克风支架（弧线）
  ctx.beginPath();
  ctx.arc(8, 9, 4, 0, Math.PI);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // 底部线条
  ctx.beginPath();
  ctx.moveTo(4, 14);
  ctx.lineTo(12, 14);
  ctx.stroke();
  
  return canvas.toBuffer('png');
}

// 创建应用图标（各种尺寸）
function createAppIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#007AFF');
  gradient.addColorStop(1, '#5856D6');
  
  // 圆角矩形背景
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();
  
  // 绘制麦克风图标（白色）
  ctx.fillStyle = '#FFFFFF';
  const scale = size / 32;
  
  // 麦克风头部
  ctx.beginPath();
  ctx.arc(16 * scale, 12 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // 麦克风身体
  ctx.beginPath();
  ctx.moveTo(10 * scale, 16 * scale);
  ctx.lineTo(22 * scale, 16 * scale);
  ctx.lineTo(20 * scale, 24 * scale);
  ctx.lineTo(12 * scale, 24 * scale);
  ctx.closePath();
  ctx.fill();
  
  // 麦克风支架（弧线）
  ctx.beginPath();
  ctx.arc(16 * scale, 18 * scale, 8 * scale, 0, Math.PI);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();
  
  // 底部线条
  ctx.beginPath();
  ctx.moveTo(8 * scale, 28 * scale);
  ctx.lineTo(24 * scale, 28 * scale);
  ctx.stroke();
  
  return canvas.toBuffer('png');
}

// 保存图标
const assetsDir = __dirname;

// 保存模板图标
fs.writeFileSync(path.join(assetsDir, 'iconTemplate.png'), createTemplateIcon());
console.log('Created iconTemplate.png');

// 保存应用图标（各种尺寸）
[16, 32, 64, 128, 256, 512, 1024].forEach(size => {
  fs.writeFileSync(path.join(assetsDir, `icon-${size}.png`), createAppIcon(size));
  console.log(`Created icon-${size}.png`);
});

console.log('All icons created successfully!');
