import winston from 'winston';
import { config } from '../config/env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf((info) => {
  const { level, message, timestamp: ts, stack, ...meta } = info;
  let log = `${String(ts)} [${level}]: ${String(message)}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  if (stack) {
    log += `\n${String(stack)}`;
  }
  return log;
});

export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

// Add file transport in production
if (config.isProduction) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}
