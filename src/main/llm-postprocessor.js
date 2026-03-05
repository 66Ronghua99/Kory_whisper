/**
 * Deps: none (uses global fetch/AbortController)
 * Used By: whisper-engine.js
 * Last Updated: 2026-03-05
 *
 * 轻量 LLM 后处理器 - 可选断句/术语修正，失败自动回退
 */

class LLMPostprocessor {
  constructor(config = {}) {
    this.updateConfig(config);
  }

  clampInt(value, fallback, min, max) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  clampFloat(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  updateConfig(config = {}) {
    const defaults = {
      enabled: false,
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      timeoutMs: 1500,
      minChars: 20,
      maxChars: 220,
      temperature: 0.1,
      apiKeyEnv: 'KORY_LLM_API_KEY',
      apiKey: ''
    };
    const merged = { ...defaults, ...config };
    const minChars = this.clampInt(merged.minChars, defaults.minChars, 1, 4000);
    const maxChars = this.clampInt(merged.maxChars, defaults.maxChars, 10, 8000);

    this.config = {
      ...merged,
      enabled: merged.enabled === true,
      endpoint: String(merged.endpoint || defaults.endpoint).trim(),
      model: String(merged.model || defaults.model).trim(),
      timeoutMs: this.clampInt(merged.timeoutMs, defaults.timeoutMs, 300, 15000),
      minChars,
      maxChars: Math.max(maxChars, minChars),
      temperature: this.clampFloat(merged.temperature, defaults.temperature, 0, 1),
      apiKeyEnv: String(merged.apiKeyEnv || defaults.apiKeyEnv).trim(),
      apiKey: String(merged.apiKey || '').trim()
    };
  }

  getScriptInstruction(context = {}) {
    if (context.outputScript === 'traditional') {
      return '中文场景下优先输出繁体中文。';
    }
    if (context.outputScript === 'original') {
      return '保持原始文本脚本，不强制转换简繁。';
    }
    return '中文场景下优先输出简体中文。';
  }

  getApiKey() {
    if (this.config.apiKey && String(this.config.apiKey).trim()) {
      return String(this.config.apiKey).trim();
    }

    const envName = this.config.apiKeyEnv || 'KORY_LLM_API_KEY';
    const envValue = process.env[envName];
    return envValue ? String(envValue).trim() : '';
  }

  canRun(text) {
    if (!this.config.enabled) return false;
    if (!text || !text.trim()) return false;
    if (typeof fetch !== 'function') return false;
    if (!this.getApiKey()) return false;

    const len = text.trim().length;
    if (len < this.config.minChars) return false;
    if (len > this.config.maxChars) return false;
    return true;
  }

  buildMessages(text, context = {}) {
    const terms = Array.isArray(context.words) ? context.words.filter(Boolean).slice(0, 30) : [];
    const replacements = context.replacements || {};
    const replacementList = Object.entries(replacements).slice(0, 30);

    const system = [
      '你是语音转写后处理器。',
      '只做以下事情：断句、补标点、术语纠正。',
      '禁止改变原意，禁止增删事实，禁止扩写。',
      this.getScriptInstruction(context),
      '保留英文品牌名和缩写的大小写。'
    ].join('\n');

    const user = [
      `原始文本：${text}`,
      terms.length ? `术语白名单：${terms.join('、')}` : '',
      replacementList.length
        ? `优先替换映射：${replacementList.map(([k, v]) => `${k}=>${v}`).join('；')}`
        : '',
      '请直接输出修正后的最终文本，不要解释。'
    ].filter(Boolean).join('\n');

    return [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ];
  }

  sanitizeOutput(output) {
    if (!output) return '';
    return String(output)
      .replace(/^```[\w-]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }

  async process(text, context = {}) {
    if (!this.canRun(text)) {
      return text;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.buildMessages(text, context),
          temperature: this.config.temperature,
          max_tokens: 240
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return text;
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      const sanitized = this.sanitizeOutput(content);
      return sanitized || text;
    } catch {
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = LLMPostprocessor;
