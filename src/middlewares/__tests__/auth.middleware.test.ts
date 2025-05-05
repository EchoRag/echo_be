import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, getAuth, clerkClient } from '@clerk/express';
import { UserService } from '../../services/user.service';
import { authenticateUser, extractUser, authenticateService } from '../auth.middleware';

// Mock Clerk dependencies
jest.mock('@clerk/express', () => {
  const mockMiddleware = jest.fn((_req: Request, _res: Response, next: NextFunction) => next());
  return {
    clerkMiddleware: jest.fn().mockReturnValue(mockMiddleware),
    getAuth: jest.fn(),
    clerkClient: {
      users: {
        getUser: jest.fn(),
      },
    },
  };
});

// Mock UserService
jest.mock('../../services/user.service');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should call clerkMiddleware and pass through to next()', () => {
      const middleware = authenticateUser;
      const clerkMiddlewareFn = clerkMiddleware();
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(clerkMiddleware).toHaveBeenCalled();
      expect(clerkMiddlewareFn).toHaveBeenCalledWith(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
    });
  });

  describe('extractUser', () => {
    it('should return 401 if no userId is present', async () => {
      (getAuth as jest.Mock).mockReturnValue({ userId: null });
      
      await extractUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle Clerk API errors gracefully', async () => {
      (getAuth as jest.Mock).mockReturnValue({ userId: 'clerk_123' });
      (clerkClient.users.getUser as jest.Mock).mockRejectedValue(new Error('Clerk API Error'));

      await extractUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should extract user and attach to request when userId is present', async () => {
      const mockClerkUser = {
        id: 'clerk_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        providerUid: 'clerk_123',
      };

      (getAuth as jest.Mock).mockReturnValue({ userId: 'clerk_123' });
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
      
      const mockUserService = {
        getUserMiddleware: jest.fn().mockResolvedValue(mockUser),
      };
      (UserService as jest.Mock).mockImplementation(() => mockUserService);

      await extractUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        providerUid: mockUser.providerUid,
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle UserService errors gracefully', async () => {
      (getAuth as jest.Mock).mockReturnValue({ userId: 'clerk_123' });
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      });
      
      const mockUserService = {
        getUserMiddleware: jest.fn().mockRejectedValue(new Error('UserService Error')),
      };
      (UserService as jest.Mock).mockImplementation(() => mockUserService);

      await extractUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authenticateService', () => {
    it('should return 401 if no authorization header is present', async () => {
      await authenticateService(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing or invalid authorization header',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is not Bearer token', async () => {
      mockRequest.headers = {
        authorization: 'Invalid token',
      };

      await authenticateService(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing or invalid authorization header',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if service token is invalid', async () => {
      process.env.SERVICE_TOKEN = 'valid_token';
      mockRequest.headers = {
        authorization: 'Bearer invalid_token',
      };

      await authenticateService(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid service token',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() if service token is valid', async () => {
      process.env.SERVICE_TOKEN = 'valid_token';
      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      };

      await authenticateService(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
}); 