import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import logger from '../config/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    logger.warn(`AppError: ${error.message}`, {
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
    });
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
  }

  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}; 