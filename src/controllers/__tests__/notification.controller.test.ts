import { Request, Response } from 'express';
import { NotificationController } from '../notification.controller';
import { NotificationService } from '../../services/notification.service';
import { AppError } from '../../utils/app-error';
import { Notification, NotificationType } from '../../models/notification.model';
import { DeviceToken } from '../../models/device-token.model';
import { User } from '../../models/user.model';

// Mock the service
jest.mock('../../services/notification.service');

describe('NotificationController', () => {
  let notificationController: NotificationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockNotificationService: jest.Mocked<NotificationService>;

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
      params: {},
      body: {},
      query: {},
      user: undefined,
    };

    nextFunction = jest.fn();

    // Get the mocked service instance and setup mock methods
    mockNotificationService = {
      sendNotification: jest.fn(),
      markAsRead: jest.fn(),
      getUserNotifications: jest.fn(),
      registerDeviceToken: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    // Mock the getInstance method to return our mock service
    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);
    
    notificationController = new NotificationController();
  });

  describe('sendNotification', () => {
    const mockNotification: Notification = {
      id: 'test-notification-id',
      title: 'Test Notification',
      body: 'Test Body',
      type: NotificationType.SYSTEM,
      data: { key: 'value' },
      userProviderUid: 'test-user-id',
      receipts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should send notification successfully', async () => {
      mockRequest.body = {
        title: 'Test Notification',
        body: 'Test Body',
        userProviderUid: 'test-user-id',
        type: NotificationType.SYSTEM,
        data: { key: 'value' },
      };

      mockNotificationService.sendNotification.mockResolvedValue(mockNotification);

      await notificationController.sendNotification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'test-user-id',
        'Test Notification',
        'Test Body',
        NotificationType.SYSTEM,
        { key: 'value' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockNotification);
    });

    it('should throw 400 error when required fields are missing', async () => {
      mockRequest.body = {
        title: 'Test Notification',
        // Missing body and userProviderUid
      };

      await notificationController.sendNotification(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(400);
    });
  });

  describe('markAsRead', () => {
    const mockUser: User = {
      id: 'test-user-id',
      providerUid: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      projects: [],
      conversations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should mark notification as read successfully', async () => {
      mockRequest.params = { id: 'test-notification-id' };
      mockRequest.user = mockUser;

      mockNotificationService.markAsRead.mockResolvedValue();

      await notificationController.markAsRead(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        'test-notification-id',
        'test-user-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should throw 401 error when user is not authenticated', async () => {
      mockRequest.params = { id: 'test-notification-id' };
      mockRequest.user = undefined;

      await notificationController.markAsRead(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(401);
    });
  });

  describe('getUserNotifications', () => {
    const mockUser: User = {
      id: 'test-user-id',
      providerUid: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      projects: [],
      conversations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockNotifications: Notification[] = [
      {
        id: 'notif1',
        title: 'Test 1',
        body: 'Test Body 1',
        type: NotificationType.SYSTEM,
        data: {},
        userProviderUid: 'test-user-id',
        receipts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'notif2',
        title: 'Test 2',
        body: 'Test Body 2',
        type: NotificationType.SYSTEM,
        data: {},
        userProviderUid: 'test-user-id',
        receipts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockNotificationResponse = {
      notifications: mockNotifications,
      total: 2,
      page: 1,
      limit: 10,
    };

    it('should get user notifications with default pagination', async () => {
      mockRequest.user = mockUser;
      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotificationResponse);

      await notificationController.getUserNotifications(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        'test-user-id',
        1,
        10
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockNotificationResponse);
    });

    it('should get user notifications with custom pagination', async () => {
      mockRequest.user = mockUser;
      mockRequest.query = { page: '2', limit: '20' };
      const customResponse = {
        ...mockNotificationResponse,
        page: 2,
        limit: 20,
      };
      mockNotificationService.getUserNotifications.mockResolvedValue(customResponse);

      await notificationController.getUserNotifications(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        'test-user-id',
        2,
        20
      );
      expect(mockResponse.json).toHaveBeenCalledWith(customResponse);
    });

    it('should throw 401 error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await notificationController.getUserNotifications(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(401);
    });
  });

  describe('registerDeviceToken', () => {
    const mockDeviceToken: DeviceToken = {
      id: 'test-token-id',
      fcmToken: 'test-fcm-token',
      deviceType: 'ios',
      deviceId: 'test-device-id',
      userProviderUid: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register device token successfully', async () => {
      mockRequest.body = {
        userProviderUid: 'test-user-id',
        fcmToken: 'test-fcm-token',
        deviceType: 'ios',
        deviceId: 'test-device-id',
      };

      mockNotificationService.registerDeviceToken.mockResolvedValue(mockDeviceToken);

      await notificationController.registerDeviceToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockNotificationService.registerDeviceToken).toHaveBeenCalledWith(
        'test-user-id',
        'test-fcm-token',
        'ios',
        'test-device-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockDeviceToken);
    });

    it('should throw 400 error when required fields are missing', async () => {
      mockRequest.body = {
        userProviderUid: 'test-user-id',
        // Missing fcmToken
      };

      await notificationController.registerDeviceToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(400);
    });
  });
}); 