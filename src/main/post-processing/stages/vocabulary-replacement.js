function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTermPattern(source) {
  const escaped = escapeRegExp(source);
  const asciiToken = /^[A-Za-z0-9][A-Za-z0-9 &._+#-]*$/.test(source);
  const containsChinese = /[\u4E00-\u9FFF]/u.test(source);

  if (asciiToken) {
    return new RegExp(`(?<![A-Za-z0-9_./:@?&=-])${escaped}(?![A-Za-z0-9_/@?&=-]|\\.[A-Za-z0-9-])`, 'gi');
  }

  if (containsChinese) {
    return new RegExp(`(?<![\\u4E00-\\u9FFF])${escaped}(?![\\u4E00-\\u9FFF])`, 'g');
  }

  return new RegExp(escaped, 'g');
}

function getCanonicalWords(context = {}) {
  return Array.isArray(context.vocabulary?.words)
    ? context.vocabulary.words.filter(Boolean)
    : [];
}

function getExplicitReplacements(context = {}) {
  const replacements = context.vocabulary?.replacements;
  return replacements && typeof replacements === 'object' ? replacements : {};
}

function applyExplicitReplacements(text, replacements) {
  const entries = Object.entries(replacements).sort((left, right) => right[0].length - left[0].length);
  let result = text;

  for (const [from, to] of entries) {
    result = result.replace(buildTermPattern(from), to);
  }

  return result;
}

function applyCanonicalCasing(text, canonicalWords) {
  let result = text;

  for (const canonicalWord of canonicalWords) {
    result = result.replace(buildTermPattern(canonicalWord), canonicalWord);
  }

  return result;
}

function createVocabularyReplacementStage() {
  return {
    name: 'vocabulary-replacement',
    isEnabled(context = {}) {
      return context.config?.postProcessing?.stages?.vocabularyReplacement !== false;
    },
    isApplicable(state = {}, context = {}) {
      if (!state.text) {
        return false;
      }

      return getCanonicalWords(context).length > 0 || Object.keys(getExplicitReplacements(context)).length > 0;
    },
    async process(state = {}, context = {}) {
      const text = String(state.text ?? '');
      const explicitReplacements = getExplicitReplacements(context);
      const canonicalWords = getCanonicalWords(context);

      let result = text;
      result = applyExplicitReplacements(result, explicitReplacements);
      result = applyCanonicalCasing(result, canonicalWords);

      return {
        text: result,
        meta: state.meta || {}
      };
    }
  };
}

module.exports = createVocabularyReplacementStage;
