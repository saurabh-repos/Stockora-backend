const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, colorize, printf, json, errors } = format;

const isDev = process.env.NODE_ENV !== 'production';

// ─── Dev format: colored, human-readable ────────────────────────────────────
const devFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'HH:mm:ss' }),
  colorize({ all: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return stack
      ? `[${ts}] ${level}: ${message}\n${stack}`
      : `[${ts}] ${level}: ${message}`;
  })
);

// ─── Prod format: structured JSON ───────────────────────────────────────────
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
);

// ─── Plain format for log files (no ANSI color codes) ───────────────────────
const fileFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return stack
      ? `[${ts}] ${level.toUpperCase()}: ${message}\n${stack}`
      : `[${ts}] ${level.toUpperCase()}: ${message}`;
  })
);

// ─── Daily rotating file transport ──────────────────────────────────────────
const fileTransport = new DailyRotateFile({
  dirname: path.join(__dirname, '../../../logs'),
  filename: 'stockora-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Keep last 14 days
  level: 'http',  // captures http (Morgan) + info + warn + error
  format: fileFormat,
});

const errorFileTransport = new DailyRotateFile({
  dirname: path.join(__dirname, '../../../logs'),
  filename: 'stockora-error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: fileFormat,
});

// ─── Logger instance ─────────────────────────────────────────────────────────
// Level hierarchy: error < warn < info < http < verbose < debug < silly
// Setting 'http' captures Morgan request logs + info/warn/error in console
const logger = createLogger({
  level: isDev ? 'http' : 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
    fileTransport,
    errorFileTransport,
  ],
  exitOnError: false,
});

// ─── Morgan stream ───────────────────────────────────────────────────────────
// Pipes morgan HTTP logs through Winston at 'http' level
logger.stream = {
  write: (message) => logger.http(message.trimEnd()),
};

module.exports = logger;
