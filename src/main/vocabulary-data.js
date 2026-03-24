const fs = require('fs').promises;
const { normalizeVocabulary } = require('./post-processing/context.js');

const EMPTY_VOCABULARY_DATA = Object.freeze({
  words: Object.freeze([]),
  replacements: Object.freeze({})
});

async function loadVocabularyData(vocabPath) {
  if (!vocabPath) {
    return {
      words: [],
      replacements: {}
    };
  }

  try {
    const data = await fs.readFile(vocabPath, 'utf-8');
    return normalizeVocabulary(JSON.parse(data));
  } catch (error) {
    console.warn('[Vocabulary] Failed to load vocabulary file:', error.message);
    return {
      words: [],
      replacements: {}
    };
  }
}

module.exports = {
  EMPTY_VOCABULARY_DATA,
  loadVocabularyData
};
