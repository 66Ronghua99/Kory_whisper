const PostProcessorPipeline = require('./pipeline.js');
const createScriptNormalizationStage = require('./stages/script-normalization.js');
const createVocabularyReplacementStage = require('./stages/vocabulary-replacement.js');
const createBasicItnStage = require('./stages/basic-itn.js');
const createDisfluencyCleanupStage = require('./stages/disfluency-cleanup.js');
const createPunctuationStage = require('./stages/punctuation.js');

function createDefaultPipeline(options = {}) {
  const stages = Array.isArray(options.stages)
    ? options.stages
    : [
      createScriptNormalizationStage(),
      createVocabularyReplacementStage(),
      createBasicItnStage(),
      createDisfluencyCleanupStage(),
      createPunctuationStage()
    ];

  return new PostProcessorPipeline({ stages });
}

module.exports = createDefaultPipeline;
