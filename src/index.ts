import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);
logger.info('platform ready', {
  environment: config.environment,
  targetMode: config.targetMode,
});
