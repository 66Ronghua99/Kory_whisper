const { app } = require('electron');
const logger = require('./logger');
const { bootstrapApp } = require('./app/bootstrap');
const { registerAppLifecycle } = require('./app/lifecycle');

registerAppLifecycle({
  app,
  logger,
  createBootstrap() {
    return bootstrapApp({
      app,
      logger
    });
  }
});
