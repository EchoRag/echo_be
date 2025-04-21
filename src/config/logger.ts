import winston from 'winston';
import path from 'path';
import LokiTransport from 'winston-loki';

const logDir = path.join(process.cwd(), 'logs');

// Add telemetry data to log format
const telemetryFormat = winston.format((info) => {
  const requestId = (global as any).requestId || 'no-request-id';
  const userId = (global as any).userId || 'no-user-id';
  const userAgent = (global as any).userAgent || 'no-user-agent';
  const ip = (global as any).ip || 'no-ip';

  return {
    ...info,
    requestId,
    userId,
    userAgent,
    ip,
    timestamp: new Date().toISOString(),
  };
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    telemetryFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'echo-be',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    }),
    new LokiTransport({
      host: process.env.LOKI_HOST || 'http://localhost:3100',
      basicAuth: `${process.env.LOKI_USERNAME}:${process.env.LOKI_PASSWORD}`,
      labels: { 
        app: 'echo-be',
        environment: process.env.NODE_ENV || 'development',
        service: 'echo-be',
        version: process.env.npm_package_version || '1.0.0'
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err: Error) => console.error('Loki connection error:', err)
    })
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger; 