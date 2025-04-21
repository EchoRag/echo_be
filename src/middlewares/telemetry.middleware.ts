import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const telemetryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate or get request ID
  const requestId = req.headers['x-request-id'] as string || req.headers['x-trace-id'] as string || uuidv4();
  
  // Set telemetry data in global scope for logger
  (global as any).requestId = requestId;
  (global as any).userId = req.user?.providerUid || 'anonymous';
  (global as any).userAgent = req.headers['user-agent'] || 'unknown';
  (global as any).ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
}; 