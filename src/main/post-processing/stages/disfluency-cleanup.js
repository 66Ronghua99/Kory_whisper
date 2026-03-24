const LEADING_PARTICLE_FILLER_PATTERN = /^(?:(?:嗯|呃|额|啊)\s*)+/u;
const LEADING_REPEATED_DEMONSTRATIVE_NOUN_PATTERN = /^(这个|那个)(?:\1)+(?=[\u4E00-\u9FFF])/u;
const LEADING_SPACED_REPEATED_DEMONSTRATIVE_NOUN_PATTERN = /^(这个|那个)\s+\1(?=[\u4E00-\u9FFF])/u;
const LEADING_REPEATED_DEMONSTRATIVE_MIXED_NOUN_PATTERN = /^(这个|那个)(?:\1)+(\s+[A-Za-z][A-Za-z0-9._/-]*)/u;
const LEADING_SPACED_REPEATED_DEMONSTRATIVE_MIXED_NOUN_PATTERN = /^(这个|那个)\s+\1(\s+[A-Za-z][A-Za-z0-9._/-]*)/u;
const LEADING_REPEATED_DEMONSTRATIVE_FILLER_PATTERN = /^(这个|那个)(?:\s*\1){1,}(?=\s)/u;
const ADJACENT_FILLER_REPETITION_PATTERN = /(^|\s)(我觉得|就是说|就是|然后呢|然后)\s+\2(?=[\u4E00-\u9FFF\s，。！？；：]|$)/gu;

function collapseAdjacentRepetitions(text) {
  let result = text;
  let previous;

  do {
    previous = result;
    result = result.replace(ADJACENT_FILLER_REPETITION_PATTERN, '$1$2');
  } while (result !== previous);

  return result;
}

function createDisfluencyCleanupStage() {
  return {
    name: 'disfluency-cleanup',
    isEnabled(context = {}) {
      return context.config?.postProcessing?.stages?.disfluencyCleanup !== false;
    },
    isApplicable(state = {}) {
      return Boolean(state.text);
    },
    async process(state = {}) {
      const text = String(state.text ?? '');

      let result = text.replace(LEADING_PARTICLE_FILLER_PATTERN, '');
      result = result.replace(LEADING_REPEATED_DEMONSTRATIVE_NOUN_PATTERN, '$1');
      result = result.replace(LEADING_SPACED_REPEATED_DEMONSTRATIVE_NOUN_PATTERN, '$1');
      result = result.replace(LEADING_REPEATED_DEMONSTRATIVE_MIXED_NOUN_PATTERN, '$1$2');
      result = result.replace(LEADING_SPACED_REPEATED_DEMONSTRATIVE_MIXED_NOUN_PATTERN, '$1$2');
      result = result.replace(LEADING_REPEATED_DEMONSTRATIVE_FILLER_PATTERN, '');
      result = collapseAdjacentRepetitions(result);
      result = result.replace(/\s+/g, ' ').trim();

      return {
        text: result,
        meta: state.meta || {}
      };
    }
  };
}

module.exports = createDisfluencyCleanupStage;
