function toTrimmedString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toBoolean(value, fallback = false) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    if (['false', '0', 'no', 'off', 'disabled', 'disable'].includes(normalized)) {
      return false;
    }
    if (['true', '1', 'yes', 'on', 'enabled', 'enable'].includes(normalized)) {
      return true;
    }
  }

  return Boolean(value);
}

function normalizeVocabulary(vocabulary = {}) {
  const words = Array.isArray(vocabulary.words)
    ? vocabulary.words.map((word) => toTrimmedString(word)).filter(Boolean)
    : [];

  const replacements = {};
  const sourceReplacements = vocabulary.replacements;

  if (Array.isArray(sourceReplacements)) {
    for (const entry of sourceReplacements) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const from = toTrimmedString(entry[0]);
        const to = toTrimmedString(entry[1]);
        if (from && to) {
          replacements[from] = to;
        }
        continue;
      }

      if (entry && typeof entry === 'object') {
        const from = toTrimmedString(entry.from);
        const to = toTrimmedString(entry.to);
        if (from && to) {
          replacements[from] = to;
        }
      }
    }
  } else if (sourceReplacements && typeof sourceReplacements === 'object') {
    for (const [from, to] of Object.entries(sourceReplacements)) {
      const normalizedFrom = toTrimmedString(from);
      const normalizedTo = toTrimmedString(to);
      if (normalizedFrom && normalizedTo) {
        replacements[normalizedFrom] = normalizedTo;
      }
    }
  }

  return {
    words,
    replacements
  };
}

function normalizeStagePreferences(stages = {}) {
  return {
    basicItn: toBoolean(stages.basicItn, true),
    disfluencyCleanup: toBoolean(stages.disfluencyCleanup, true),
    scriptNormalization: toBoolean(stages.scriptNormalization, true),
    vocabularyReplacement: toBoolean(stages.vocabularyReplacement, true),
    punctuation: toBoolean(stages.punctuation, true)
  };
}

function resolveEffectiveStageConfig(stagePreferences, options = {}) {
  const {
    postProcessingEnabled = true,
    vocabularyEnabled = true,
    punctuationEnabled = true
  } = options;

  const resolveStageEnabled = (value) => postProcessingEnabled && value;

  return {
    basicItn: resolveStageEnabled(stagePreferences.basicItn),
    disfluencyCleanup: resolveStageEnabled(stagePreferences.disfluencyCleanup),
    scriptNormalization: resolveStageEnabled(stagePreferences.scriptNormalization),
    vocabularyReplacement: resolveStageEnabled(stagePreferences.vocabularyReplacement) && vocabularyEnabled,
    punctuation: resolveStageEnabled(stagePreferences.punctuation) && punctuationEnabled
  };
}

function normalizeConfig(config = {}, options = {}) {
  const whisper = config.whisper || {};
  const vocabulary = config.vocabulary || {};
  const postProcessing = config.postProcessing || {};
  const stages = postProcessing.stages || {};
  const effectiveStageToggles = options.effectiveStageToggles !== false;

  const postProcessingEnabled = toBoolean(postProcessing.enabled, true);
  const vocabularyEnabled = toBoolean(vocabulary.enabled, true);
  const punctuationEnabled = toBoolean(whisper.enablePunctuation, true);
  const stagePreferences = normalizeStagePreferences(stages);
  const effectiveStages = effectiveStageToggles
    ? resolveEffectiveStageConfig(stagePreferences, {
      postProcessingEnabled,
      vocabularyEnabled,
      punctuationEnabled
    })
    : stagePreferences;

  return {
    ...config,
    whisper: {
      ...whisper,
      language: toTrimmedString(whisper.language, 'zh'),
      prompt: toTrimmedString(whisper.prompt, ''),
      outputScript: toTrimmedString(whisper.outputScript, 'simplified'),
      enablePunctuation: punctuationEnabled
    },
    vocabulary: {
      ...vocabulary,
      enabled: vocabularyEnabled,
      path: toTrimmedString(vocabulary.path, '')
    },
    postProcessing: {
      ...postProcessing,
      enabled: postProcessingEnabled,
      pipeline: toTrimmedString(postProcessing.pipeline, 'default'),
      stages: effectiveStages
    }
  };
}

function normalizeRuntime(runtime = {}, defaults = {}) {
  const languageFallback = toTrimmedString(defaults.language, 'zh');
  const outputScriptFallback = toTrimmedString(defaults.outputScript, 'simplified');

  return {
    ...runtime,
    language: toTrimmedString(runtime.language, languageFallback),
    outputScript: toTrimmedString(runtime.outputScript, outputScriptFallback)
  };
}

function createPostProcessingContext(input = {}) {
  const text = toTrimmedString(input.text, '');
  const config = normalizeConfig(input.config || {});

  return {
    text,
    config,
    runtime: normalizeRuntime(input.runtime || {}, {
      language: config.whisper.language,
      outputScript: config.whisper.outputScript
    }),
    vocabulary: normalizeVocabulary(input.vocabulary || {})
  };
}

module.exports = {
  createPostProcessingContext,
  normalizeConfig,
  normalizeRuntime,
  normalizeVocabulary
};
