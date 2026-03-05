/**
 * Deps: fs, path, os
 * Used By: index.js
 * Last Updated: 2024-03-04
 *
 * 日志记录器 - 将日志写入文件便于调试
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class Logger {
  constructor() {
    this.logDir = path.join(os.homedir(), '.kory-whisper');
    this.logFile = path.join(this.logDir, 'app.log');
    this.maxLines = 1000; // 保留最近1000行日志
  }

  async init() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('[Logger] Failed to create log directory:', error);
    }
  }

  async log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;

    // 同时输出到控制台
    console.log(logEntry, ...args);

    // 写入文件
    try {
      const extra = args.length > 0 ? ' ' + args.map(a =>
        typeof a === 'object' ? JSON.stringify(a) : String(a)
      ).join(' ') : '';

      await fs.appendFile(this.logFile, logEntry + extra + '\n', 'utf-8');
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  info(message, ...args) {
    return this.log('INFO', message, ...args);
  }

  error(message, ...args) {
    return this.log('ERROR', message, ...args);
  }

  warn(message, ...args) {
    return this.log('WARN', message, ...args);
  }

  debug(message, ...args) {
    return this.log('DEBUG', message, ...args);
  }

  async getRecentLogs(lines = 100) {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      const allLines = content.split('\n').filter(l => l.trim());
      return allLines.slice(-lines).join('\n');
    } catch {
      return 'No logs available';
    }
  }

  getLogPath() {
    return this.logFile;
  }
}

module.exports = new Logger();
