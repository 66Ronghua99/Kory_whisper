const createDefaultPipeline = require('./create-default-pipeline.js');

async function applyPostProcessing(text, context = {}, options = {}) {
  if (!text || !String(text).trim()) {
    return text;
  }

  if (context.config?.postProcessing?.enabled === false) {
    return text;
  }

  const logger = options.logger || console;
  const pipeline = options.pipeline || createDefaultPipeline();

  logger.info('[PostProcessing] Running pipeline on transcription');
  const result = await pipeline.process(text, context);

  for (const error of result.errors || []) {
    logger.warn(
      `[PostProcessing] Stage failed: ${error.stage} - ${error.error?.message || 'Unknown error'}`
    );
  }

  const finalText = typeof result.text === 'string' ? result.text : text;
  logger.info('[PostProcessing] Final text:', finalText);
  return finalText;
}

module.exports = applyPostProcessing;
