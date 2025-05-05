import { Request, Response, NextFunction } from 'express';
import { telemetryMiddleware } from '../telemetry.middleware';
import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'net';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('Telemetry Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset global scope
    (global as any).requestId = undefined;
    (global as any).userId = undefined;
    (global as any).userAgent = undefined;
    (global as any).ip = undefined;

    mockRequest = {
      headers: {},
      connection: {
        remoteAddress: '127.0.0.1',
      } as Socket,
    };
    // Set ip using Object.defineProperty since it's read-only
    Object.defineProperty(mockRequest, 'ip', {
      value: '127.0.0.1',
      writable: true,
    });

    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should generate a new request ID when none is provided', () => {
    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(uuidv4).toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'mocked-uuid');
    expect((global as any).requestId).toBe('mocked-uuid');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use x-request-id header if provided', () => {
    mockRequest.headers = {
      'x-request-id': 'provided-request-id',
    };

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(uuidv4).not.toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'provided-request-id');
    expect((global as any).requestId).toBe('provided-request-id');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use x-trace-id header if x-request-id is not provided', () => {
    mockRequest.headers = {
      'x-trace-id': 'provided-trace-id',
    };

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(uuidv4).not.toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'provided-trace-id');
    expect((global as any).requestId).toBe('provided-trace-id');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set user ID from request user if available', () => {
    mockRequest.user = {
      providerUid: 'user-123',
    } as any;

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).userId).toBe('user-123');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set anonymous user ID when no user is available', () => {
    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).userId).toBe('anonymous');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set user agent from headers if available', () => {
    mockRequest.headers = {
      'user-agent': 'Mozilla/5.0',
    };

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).userAgent).toBe('Mozilla/5.0');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set unknown user agent when not provided', () => {
    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).userAgent).toBe('unknown');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set IP from request.ip if available', () => {
    Object.defineProperty(mockRequest, 'ip', {
      value: '192.168.1.1',
      writable: true,
    });

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).ip).toBe('192.168.1.1');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should fallback to connection.remoteAddress if ip is not available', () => {
    Object.defineProperty(mockRequest, 'ip', {
      value: undefined,
      writable: true,
    });
    mockRequest.connection = {
      remoteAddress: '192.168.1.2',
    } as Socket;

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).ip).toBe('192.168.1.2');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set unknown IP when neither ip nor remoteAddress is available', () => {
    Object.defineProperty(mockRequest, 'ip', {
      value: undefined,
      writable: true,
    });
    mockRequest.connection = {
      remoteAddress: undefined,
    } as Socket;

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).ip).toBe('unknown');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set all telemetry data correctly in a single request', () => {
    mockRequest.headers = {
      'x-request-id': 'test-request-id',
      'user-agent': 'Test Browser',
    };
    mockRequest.user = {
      providerUid: 'test-user',
    } as any;
    Object.defineProperty(mockRequest, 'ip', {
      value: '192.168.1.3',
      writable: true,
    });

    telemetryMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((global as any).requestId).toBe('test-request-id');
    expect((global as any).userId).toBe('test-user');
    expect((global as any).userAgent).toBe('Test Browser');
    expect((global as any).ip).toBe('192.168.1.3');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-request-id');
    expect(nextFunction).toHaveBeenCalled();
  });
}); 