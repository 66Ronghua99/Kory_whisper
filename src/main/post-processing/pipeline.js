class PostProcessorPipeline {
  constructor(options = {}) {
    this.stages = [];

    if (Array.isArray(options.stages)) {
      for (const stage of options.stages) {
        this.addStage(stage);
      }
    }
  }

  addStage(stage) {
    if (stage && typeof stage.process === 'function') {
      this.stages.push(stage);
    }

    return this;
  }

  registerStage(stage) {
    return this.addStage(stage);
  }

  isStageEnabled(stage, context) {
    if (!stage) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(stage, 'enabled')) {
      return stage.enabled !== false;
    }
    if (typeof stage.isEnabled === 'function') {
      return stage.isEnabled(context) !== false;
    }
    return true;
  }

  isStageApplicable(stage, state, context) {
    if (!stage || typeof stage.isApplicable !== 'function') {
      return true;
    }

    return stage.isApplicable(state, context) !== false;
  }

  async process(text, context = {}) {
    const result = {
      text: String(text ?? ''),
      meta: {},
      errors: []
    };

    for (const stage of this.stages) {
      const stageName = stage.name || 'anonymous-stage';
      const state = {
        text: result.text,
        meta: result.meta
      };

      if (!this.isStageEnabled(stage, context)) {
        continue;
      }

      try {
        if (!this.isStageApplicable(stage, state, context)) {
          continue;
        }

        const stageResult = await stage.process(state, context);
        if (!stageResult) {
          continue;
        }

        if (typeof stageResult.text === 'string') {
          result.text = stageResult.text;
        }

        if (stageResult.meta && typeof stageResult.meta === 'object') {
          result.meta = { ...result.meta, ...stageResult.meta };
        }
      } catch (error) {
        result.errors.push({
          stage: stageName,
          error: {
            name: error && error.name ? error.name : 'Error',
            message: error && error.message ? error.message : String(error)
          },
          text: result.text
        });
      }
    }

    return result;
  }
}

module.exports = PostProcessorPipeline;
