import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../error.middleware';
import { AppError } from '../../utils/app-error';
import logger from '../../config/logger';

// Mock logger
jest.mock('../../config/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'GET',
      url: '/test',
      baseUrl: '',
      originalUrl: '/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const appError = new AppError(400, 'Test error');
      
      errorHandler(
        appError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'AppError: Test error',
        expect.objectContaining({
          statusCode: 400,
          path: '/test',
          method: 'GET',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle different status codes for AppError', () => {
      const appError = new AppError(404, 'Not Found');
      
      errorHandler(
        appError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'AppError: Not Found',
        expect.objectContaining({
          statusCode: 404,
          path: '/test',
          method: 'GET',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Not Found',
      });
    });

    it('should handle regular Error with 500 status code', () => {
      const error = new Error('Unexpected error');
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled error:',
        expect.objectContaining({
          error: 'Unexpected error',
          stack: error.stack,
          path: '/test',
          method: 'GET',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      });
    });

    it('should handle errors with different HTTP methods', () => {
      const requestWithPost = {
        ...mockRequest,
        method: 'POST',
      };
      const error = new Error('Post error');
      
      errorHandler(
        error,
        requestWithPost as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled error:',
        expect.objectContaining({
          error: 'Post error',
          path: '/test',
          method: 'POST',
        })
      );
    });

    it('should handle errors with different paths', () => {
      const requestWithPath = {
        ...mockRequest,
        path: '/api/users',
        url: '/api/users',
        originalUrl: '/api/users',
      };
      const appError = new AppError(404, 'User not found');
      
      errorHandler(
        appError,
        requestWithPath as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'AppError: User not found',
        expect.objectContaining({
          statusCode: 404,
          path: '/api/users',
          method: 'GET',
        })
      );
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('No stack');
      delete error.stack;
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled error:',
        expect.objectContaining({
          error: 'No stack',
          stack: undefined,
          path: '/test',
          method: 'GET',
        })
      );
    });
  });
}); 