const OpenCC = require('opencc-js');

function createDefaultConverter() {
  const twToCn = OpenCC.Converter({ from: 'twp', to: 'cn' });
  const hkToCn = OpenCC.Converter({ from: 'hk', to: 'cn' });
  return (text) => hkToCn(twToCn(text));
}

function isChineseRuntime(context = {}) {
  const language = String(context.runtime?.language || '').trim().toLowerCase();
  return language === 'zh' || language === 'auto';
}

function shouldNormalizeScript(state = {}, context = {}) {
  if (!state.text) {
    return false;
  }

  if (!isChineseRuntime(context)) {
    return false;
  }

  return String(context.runtime?.outputScript || '').trim().toLowerCase() === 'simplified';
}

function createScriptNormalizationStage(options = {}) {
  const instanceState = {
    initialized: false,
    converter: null,
    initError: null
  };

  function ensureConverterInitialized() {
    if (instanceState.initialized) {
      return;
    }

    instanceState.initialized = true;

    try {
      const createConverter = options.createConverter || createDefaultConverter;
      instanceState.converter = createConverter();
    } catch (error) {
      instanceState.initError = error;
    }
  }

  return {
    name: 'script-normalization',
    isEnabled(context = {}) {
      return context.config?.postProcessing?.stages?.scriptNormalization !== false;
    },
    isApplicable(state, context) {
      return shouldNormalizeScript(state, context);
    },
    async process(state = {}, context = {}) {
      const text = String(state.text ?? '');
      if (!shouldNormalizeScript({ text }, context)) {
        return { text, meta: state.meta || {} };
      }

      ensureConverterInitialized();
      if (instanceState.initError) {
        throw instanceState.initError;
      }

      return {
        text: instanceState.converter(text),
        meta: state.meta || {}
      };
    }
  };
}

module.exports = createScriptNormalizationStage;
