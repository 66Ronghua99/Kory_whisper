const CONNECTORS = ['但是', '然后', '所以', '因为', '如果', '不过', '并且', '而且', '另外', '同时', '比如', '例如', '还有'];
const TECHNICAL_SPAN_TOKEN = '__TECHNICAL_SPAN__';
const TECHNICAL_SPAN_PATTERN = /https?:\/\/\S+|\b(?:npm|pnpm|yarn)\s+[A-Za-z0-9._-]+\s+[A-Za-z0-9._:-]+\b|\/[A-Za-z0-9._/-]+\?[A-Za-z0-9._~%=&-]+|\b(?:localhost|[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::\d+)?(?:\/[A-Za-z0-9._~/%+-]*)?(?:\?[A-Za-z0-9._~%=&-]+)?\b|\b\d+\.\d+\.\d+\b|[A-Za-z0-9_]+:\s*[A-Za-z0-9._/-]+\b|[A-Za-z0-9_]+:\s*\{[^{}\n]+\}|[A-Za-z0-9_]+:\s*\[[^\[\]\n]+\]|[A-Za-z0-9_]+:\s*"[^"\n]*"|\\{[^{}\n]+\\}|\[[^\[\]\n]+\]|\b[A-Za-z_][A-Za-z0-9_]*\([^()\n]*\)|"[^"\n]*"/gi;

function getRuntimeLanguage(context = {}) {
  const language = String(context.runtime?.language || '').trim().toLowerCase();
  return language || 'zh';
}

function hasChineseText(text) {
  return /[\u4E00-\u9FFF]/u.test(text);
}

function shouldApplyChinesePunctuation(text, context = {}) {
  const language = getRuntimeLanguage(context);

  if (language === 'zh') {
    return hasChineseText(text);
  }

  if (language !== 'auto') {
    return false;
  }

  if (!hasChineseText(text)) {
    return false;
  }

  return true;
}

function protectTechnicalSpans(text) {
  const spans = [];
  const protectedText = text.replace(TECHNICAL_SPAN_PATTERN, (match) => {
    const token = `${TECHNICAL_SPAN_TOKEN}${spans.length}__`;
    spans.push(match);
    return token;
  });

  return {
    text: protectedText,
    spans
  };
}

function restoreTechnicalSpans(text, spans) {
  let result = text;

  spans.forEach((span, index) => {
    result = result.replace(`${TECHNICAL_SPAN_TOKEN}${index}__`, span);
  });

  return result;
}

function normalizeChinesePunctuation(text) {
  const protectedSpans = protectTechnicalSpans(text);
  let result = protectedSpans.text;

  result = result
    .replace(/,/g, '，')
    .replace(/;/g, '；')
    .replace(/\?/g, '？')
    .replace(/!/g, '！')
    .replace(/:/g, '：');

  result = result.replace(/([\u4E00-\u9FFF])\s+([\u4E00-\u9FFF])/gu, '$1$2');
  result = result.replace(/\s+/g, ' ').trim();

  for (const connector of CONNECTORS) {
    const pattern = new RegExp(`([^，。！？；：\\s])\\s*(${connector})`, 'gu');
    result = result.replace(pattern, '$1，$2');
  }

  result = restoreTechnicalSpans(result, protectedSpans.spans);

  if (/[A-Za-z0-9\u4E00-\u9FFF}\]"')>]$/u.test(result) && !/[。！？]$/u.test(result)) {
    result += '。';
  }

  return result;
}

function createPunctuationStage() {
  return {
    name: 'punctuation',
    isEnabled(context = {}) {
      return context.config?.postProcessing?.stages?.punctuation !== false;
    },
    isApplicable(state = {}, context = {}) {
      return Boolean(state.text) && shouldApplyChinesePunctuation(String(state.text ?? ''), context);
    },
    async process(state = {}, context = {}) {
      const text = String(state.text ?? '');
      if (!shouldApplyChinesePunctuation(text, context)) {
        return {
          text,
          meta: state.meta || {}
        };
      }

      return {
        text: normalizeChinesePunctuation(text),
        meta: state.meta || {}
      };
    }
  };
}

module.exports = createPunctuationStage;
