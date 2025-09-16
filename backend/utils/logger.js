const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
require('fs').mkdirSync(logsDir, { recursive: true });

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'economic-justice-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // Write all logs with level `error` and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Write all logs with level `info` and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Write HTTP request logs to access.log
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],

  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Create a stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Add network-specific logging methods
logger.network = {
  info: (peerId, message, meta = {}) => {
    logger.info(message, { ...meta, component: 'network', peerId });
  },

  error: (peerId, message, meta = {}) => {
    logger.error(message, { ...meta, component: 'network', peerId });
  },

  debug: (peerId, message, meta = {}) => {
    logger.debug(message, { ...meta, component: 'network', peerId });
  },

  warn: (peerId, message, meta = {}) => {
    logger.warn(message, { ...meta, component: 'network', peerId });
  }
};

// Add database-specific logging methods
logger.database = {
  info: (operation, message, meta = {}) => {
    logger.info(message, { ...meta, component: 'database', operation });
  },

  error: (operation, message, meta = {}) => {
    logger.error(message, { ...meta, component: 'database', operation });
  }
};

// Add API-specific logging methods
logger.api = {
  info: (endpoint, message, meta = {}) => {
    logger.info(message, { ...meta, component: 'api', endpoint });
  },

  error: (endpoint, message, meta = {}) => {
    logger.error(message, { ...meta, component: 'api', endpoint });
  }
};

module.exports = logger;