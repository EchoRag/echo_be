import { Request, Response } from 'express';
import { ProxyServerController } from '../proxyserver.controller';
import { ProxyServerService } from '../../services/proxyserver.service';
import { AppError } from '../../utils/app-error';
import axios from 'axios';

// Mock the services and dependencies
jest.mock('../../services/proxyserver.service');
jest.mock('@google-cloud/recaptcha-enterprise');
jest.mock('axios');

describe('ProxyServerController', () => {
  let proxyServerController: ProxyServerController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockProxyServerService: jest.Mocked<ProxyServerService>;
  let mockRecaptchaClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Setup mock request
    mockRequest = {
      body: {},
      headers: {},
    };

    nextFunction = jest.fn();

    // Setup mock service
    mockProxyServerService = {
      registerServer: jest.fn(),
      getActiveConfig: jest.fn(),
    } as unknown as jest.Mocked<ProxyServerService>;

    // Mock ProxyServerService constructor
    (ProxyServerService as jest.Mock).mockImplementation(() => mockProxyServerService);
    
    // Setup mock reCAPTCHA client
    mockRecaptchaClient = {
      projectPath: jest.fn().mockReturnValue('projects/test-project'),
      createAssessment: jest.fn().mockResolvedValue([{
        riskAnalysis: { score: 0.8 }
      }]),
    };
    require('@google-cloud/recaptcha-enterprise').RecaptchaEnterpriseServiceClient.mockImplementation(() => mockRecaptchaClient);
    
    proxyServerController = new ProxyServerController();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GOOGLE_CLOUD_PROJECT_ID;
    delete process.env.RECAPTCHA_SITE_KEY;
    delete process.env.WEBHOOK_URL;
  });

  describe('registerServer', () => {
    const mockConfig = {
      id: 'test-config-id',
      llmServerUrl: 'http://test-server.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register server successfully', async () => {
      mockRequest.body = {
        llmServerUrl: 'http://test-server.com',
      };

      mockProxyServerService.registerServer.mockResolvedValue(mockConfig);

      await proxyServerController.registerServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProxyServerService.registerServer).toHaveBeenCalledWith('http://test-server.com');
      expect(mockResponse.json).toHaveBeenCalledWith(mockConfig);
    });

    it('should handle missing llmServerUrl', async () => {
      mockRequest.body = {};

      await proxyServerController.registerServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProxyServerService.registerServer).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('llmServerUrl is required');
    });

    it('should handle service error', async () => {
      mockRequest.body = {
        llmServerUrl: 'http://test-server.com',
      };

      const error = new Error('Service error');
      mockProxyServerService.registerServer.mockRejectedValue(error);

      await proxyServerController.registerServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe('startServer', () => {
    const mockConfig = {
      id: 'test-config-id',
      llmServerUrl: 'http://test-server.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      // Mock environment variables
      process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project';
      process.env.RECAPTCHA_SITE_KEY = 'test-site-key';
      process.env.WEBHOOK_URL = 'http://webhook-url.com';
    });

    it('should start server successfully', async () => {
      mockRequest.headers = {
        'x-recaptcha-token': 'valid-token',
      };

      mockProxyServerService.getActiveConfig.mockResolvedValue(mockConfig);
      (axios.post as jest.Mock).mockResolvedValue({ data: 'success' });

      await proxyServerController.startServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRecaptchaClient.projectPath).toHaveBeenCalledWith('test-project');
      expect(mockRecaptchaClient.createAssessment).toHaveBeenCalledWith({
        parent: 'projects/test-project',
        assessment: {
          event: {
            token: 'valid-token',
            siteKey: 'test-site-key',
            expectedAction: 'start_server'
          }
        }
      });
      expect(mockProxyServerService.getActiveConfig).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith('http://webhook-url.com');
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Server start triggered'
      });
    });

    it('should handle missing reCAPTCHA token', async () => {
      mockRequest.headers = {};

      await proxyServerController.startServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProxyServerService.getActiveConfig).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('reCAPTCHA token is required');
    });

    it('should handle failed reCAPTCHA verification', async () => {
      mockRequest.headers = {
        'x-recaptcha-token': 'invalid-token',
      };

      mockRecaptchaClient.createAssessment.mockResolvedValue([{
        riskAnalysis: { score: 0.3 }
      }]);

      await proxyServerController.startServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProxyServerService.getActiveConfig).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('Failed to verify reCAPTCHA token');
    });

    it('should handle reCAPTCHA service error', async () => {
      mockRequest.headers = {
        'x-recaptcha-token': 'valid-token',
      };

      mockRecaptchaClient.createAssessment.mockRejectedValue(new Error('reCAPTCHA service error'));

      await proxyServerController.startServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProxyServerService.getActiveConfig).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('Failed to verify reCAPTCHA token');
    });

    it('should handle no active configuration', async () => {
      mockRequest.headers = {
        'x-recaptcha-token': 'valid-token',
      };

      mockProxyServerService.getActiveConfig.mockResolvedValue(null);

      await proxyServerController.startServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProxyServerService.getActiveConfig).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(404);
      expect(nextFunction.mock.calls[0][0].message).toBe('No active LLM server configuration found');
    });

    it('should handle webhook failure', async () => {
      mockRequest.headers = {
        'x-recaptcha-token': 'valid-token',
      };

      mockProxyServerService.getActiveConfig.mockResolvedValue(mockConfig);
      (axios.post as jest.Mock).mockRejectedValue(new Error('Webhook failed'));

      await proxyServerController.startServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockProxyServerService.getActiveConfig).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith('http://webhook-url.com');
      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(500);
      expect(nextFunction.mock.calls[0][0].message).toBe('Failed to trigger server start: Webhook failed');
    });

    it('should handle missing environment variables', async () => {
      // Clear environment variables
      delete process.env.GOOGLE_CLOUD_PROJECT_ID;
      delete process.env.RECAPTCHA_SITE_KEY;
      delete process.env.WEBHOOK_URL;

      mockRequest.headers = {
        'x-recaptcha-token': 'valid-token',
      };

      // Mock the RecaptchaEnterpriseServiceClient to throw when instantiated
      require('@google-cloud/recaptcha-enterprise').RecaptchaEnterpriseServiceClient.mockImplementation(() => {
        throw new Error('Missing environment variables');
      });

      await proxyServerController.startServer(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('Failed to verify reCAPTCHA token');
    });
  });
}); 