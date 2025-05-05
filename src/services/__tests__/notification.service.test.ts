import { NotificationService } from '../notification.service';
import { AppDataSource } from '../../config/database';
import { Notification, NotificationType } from '../../models/notification.model';
import { NotificationReceipt } from '../../models/notification-receipt.model';
import { DeviceToken } from '../../models/device-token.model';
import { DocumentStatus } from '../../models/document.model';
import { AppError } from '../../utils/app-error';

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock Firebase Admin
const mockFirebaseMessaging = {
  send: jest.fn().mockResolvedValue({}),
};

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => ({
    messaging: jest.fn(() => mockFirebaseMessaging),
  })),
  credential: {
    cert: jest.fn(),
  },
  apps: [],
  messaging: jest.fn(() => mockFirebaseMessaging),
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockNotificationRepository: any;
  let mockReceiptRepository: any;
  let mockDeviceTokenRepository: any;

  const mockUserProviderUid = 'test-user-id';
  const mockFcmToken = 'test-fcm-token';
  const mockDeviceId = 'test-device-id';
  const mockDocumentId = 'test-document-id';
  const mockProjectId = 'test-project-id';
  const mockDocumentName = 'test-document.pdf';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup repository mocks
    mockNotificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockReceiptRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    mockDeviceTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      switch (entity) {
        case Notification:
          return mockNotificationRepository;
        case NotificationReceipt:
          return mockReceiptRepository;
        case DeviceToken:
          return mockDeviceTokenRepository;
        default:
          return null;
      }
    });

    // Reset the singleton instance
    (NotificationService as any).instance = undefined;
    
    // Create service instance
    notificationService = NotificationService.getInstance();
  });

  describe('registerDeviceToken', () => {
    it('should create new device token if none exists', async () => {
      const deviceToken = {
        id: 'test-token-id',
        userProviderUid: mockUserProviderUid,
        fcmToken: mockFcmToken,
        deviceType: 'web',
        deviceId: mockDeviceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(null);
      mockDeviceTokenRepository.create.mockReturnValue(deviceToken);
      mockDeviceTokenRepository.save.mockResolvedValue(deviceToken);

      const result = await notificationService.registerDeviceToken(
        mockUserProviderUid,
        mockFcmToken,
        'web',
        mockDeviceId
      );

      expect(mockDeviceTokenRepository.findOne).toHaveBeenCalledWith({
        where: {
          userProviderUid: mockUserProviderUid,
          deviceId: mockDeviceId,
        },
      });
      expect(mockDeviceTokenRepository.create).toHaveBeenCalledWith({
        userProviderUid: mockUserProviderUid,
        fcmToken: mockFcmToken,
        deviceType: 'web',
        deviceId: mockDeviceId,
      });
      expect(mockDeviceTokenRepository.save).toHaveBeenCalledWith(deviceToken);
      expect(result).toEqual(deviceToken);
    });

    it('should update existing device token', async () => {
      const existingToken = {
        id: 'test-token-id',
        userProviderUid: mockUserProviderUid,
        fcmToken: 'old-token',
        deviceType: 'web',
        deviceId: mockDeviceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedToken = {
        ...existingToken,
        fcmToken: mockFcmToken,
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(existingToken);
      mockDeviceTokenRepository.save.mockResolvedValue(updatedToken);

      const result = await notificationService.registerDeviceToken(
        mockUserProviderUid,
        mockFcmToken,
        'web',
        mockDeviceId
      );

      expect(mockDeviceTokenRepository.findOne).toHaveBeenCalledWith({
        where: {
          userProviderUid: mockUserProviderUid,
          deviceId: mockDeviceId,
        },
      });
      expect(mockDeviceTokenRepository.save).toHaveBeenCalledWith({
        ...existingToken,
        fcmToken: mockFcmToken,
      });
      expect(result).toEqual(updatedToken);
    });
  });

  describe('sendDocumentStatusNotification', () => {
    it('should send processed notification', async () => {
      const notification = {
        id: 'test-notification-id',
        type: NotificationType.DOCUMENT_PROCESSED,
        title: 'Document Processed',
        body: `"${mockDocumentName}" has been successfully processed`,
        data: {
          documentId: mockDocumentId,
          projectId: mockProjectId,
          status: DocumentStatus.PROCESSED,
          link: `${process.env.FE_URL}/projects/${mockProjectId}`,
        },
        userProviderUid: mockUserProviderUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const receipt = {
        id: 'test-receipt-id',
        notificationId: notification.id,
        userProviderUid: mockUserProviderUid,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationRepository.create.mockReturnValue(notification);
      mockNotificationRepository.save.mockResolvedValue(notification);
      mockReceiptRepository.create.mockReturnValue(receipt);
      mockReceiptRepository.save.mockResolvedValue(receipt);
      mockDeviceTokenRepository.findOne.mockResolvedValue({ fcmToken: mockFcmToken });

      const result = await notificationService.sendDocumentStatusNotification(
        mockUserProviderUid,
        mockDocumentId,
        mockProjectId,
        DocumentStatus.PROCESSED,
        mockDocumentName
      );

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        type: NotificationType.DOCUMENT_PROCESSED,
        title: 'Document Processed',
        body: `"${mockDocumentName}" has been successfully processed`,
        data: {
          documentId: mockDocumentId,
          projectId: mockProjectId,
          status: DocumentStatus.PROCESSED,
          link: `${process.env.FE_URL}/projects/${mockProjectId}`,
        },
        userProviderUid: mockUserProviderUid,
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(notification);
      expect(mockReceiptRepository.create).toHaveBeenCalledWith({
        notificationId: notification.id,
        userProviderUid: mockUserProviderUid,
        isRead: false,
      });
      expect(mockReceiptRepository.save).toHaveBeenCalledWith(receipt);
      expect(mockFirebaseMessaging.send).toHaveBeenCalled();
      expect(result).toEqual(notification);
    });

    it('should send error notification with description', async () => {
      const errorDescription = 'Test error';
      const notification = {
        id: 'test-notification-id',
        type: NotificationType.DOCUMENT_ERROR,
        title: 'Document Processing Failed',
        body: errorDescription,
        data: {
          documentId: mockDocumentId,
          projectId: mockProjectId,
          status: DocumentStatus.ERROR,
          errorDescription,
          link: `${process.env.FE_URL}/projects/${mockProjectId}`,
        },
        userProviderUid: mockUserProviderUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const receipt = {
        id: 'test-receipt-id',
        notificationId: notification.id,
        userProviderUid: mockUserProviderUid,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationRepository.create.mockReturnValue(notification);
      mockNotificationRepository.save.mockResolvedValue(notification);
      mockReceiptRepository.create.mockReturnValue(receipt);
      mockReceiptRepository.save.mockResolvedValue(receipt);
      mockDeviceTokenRepository.findOne.mockResolvedValue({ fcmToken: mockFcmToken });

      const result = await notificationService.sendDocumentStatusNotification(
        mockUserProviderUid,
        mockDocumentId,
        mockProjectId,
        DocumentStatus.ERROR,
        mockDocumentName,
        errorDescription
      );

      expect(mockNotificationRepository.save).toHaveBeenCalled();
      expect(mockFirebaseMessaging.send).toHaveBeenCalled();
      expect(result).toEqual(notification);
    });

    it('should throw error for invalid status', async () => {
      await expect(notificationService.sendDocumentStatusNotification(
        mockUserProviderUid,
        mockDocumentId,
        mockProjectId,
        'INVALID_STATUS' as DocumentStatus,
        mockDocumentName
      )).rejects.toThrow(new AppError(400, 'Invalid document status'));
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const notification = {
        id: 'test-notification-id',
        type: NotificationType.SYSTEM,
        title: 'Test Title',
        body: 'Test Body',
        data: { test: 'data' },
        userProviderUid: mockUserProviderUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const receipt = {
        id: 'test-receipt-id',
        notificationId: notification.id,
        userProviderUid: mockUserProviderUid,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationRepository.create.mockReturnValue(notification);
      mockNotificationRepository.save.mockResolvedValue(notification);
      mockReceiptRepository.create.mockReturnValue(receipt);
      mockReceiptRepository.save.mockResolvedValue(receipt);
      mockDeviceTokenRepository.findOne.mockResolvedValue({ fcmToken: mockFcmToken });

      const result = await notificationService.sendNotification(
        mockUserProviderUid,
        'Test Title',
        'Test Body',
        NotificationType.SYSTEM,
        { test: 'data' }
      );

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        type: NotificationType.SYSTEM,
        title: 'Test Title',
        body: 'Test Body',
        data: { test: 'data' },
        userProviderUid: mockUserProviderUid,
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(notification);
      expect(mockReceiptRepository.create).toHaveBeenCalledWith({
        notificationId: notification.id,
        userProviderUid: mockUserProviderUid,
        isRead: false,
      });
      expect(mockReceiptRepository.save).toHaveBeenCalledWith(receipt);
      expect(mockFirebaseMessaging.send).toHaveBeenCalledWith({
        token: mockFcmToken,
        notification: {
          title: 'Test Title',
          body: 'Test Body',
        },
        data: {
          test: 'data',
          type: NotificationType.SYSTEM.toString(),
        },
      });
      expect(result).toEqual(notification);
    });

    it('should handle missing FCM token', async () => {
      const notification = {
        id: 'test-notification-id',
        type: NotificationType.SYSTEM,
        title: 'Test Title',
        body: 'Test Body',
        userProviderUid: mockUserProviderUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const receipt = {
        id: 'test-receipt-id',
        notificationId: notification.id,
        userProviderUid: mockUserProviderUid,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationRepository.create.mockReturnValue(notification);
      mockNotificationRepository.save.mockResolvedValue(notification);
      mockReceiptRepository.create.mockReturnValue(receipt);
      mockReceiptRepository.save.mockResolvedValue(receipt);
      mockDeviceTokenRepository.findOne.mockResolvedValue(null);

      const result = await notificationService.sendNotification(
        mockUserProviderUid,
        'Test Title',
        'Test Body'
      );

      expect(mockNotificationRepository.save).toHaveBeenCalled();
      expect(mockFirebaseMessaging.send).not.toHaveBeenCalled();
      expect(result).toEqual(notification);
    });

    it('should handle Firebase error', async () => {
      const notification = {
        id: 'test-notification-id',
        type: NotificationType.SYSTEM,
        title: 'Test Title',
        body: 'Test Body',
        userProviderUid: mockUserProviderUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const receipt = {
        id: 'test-receipt-id',
        notificationId: notification.id,
        userProviderUid: mockUserProviderUid,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationRepository.create.mockReturnValue(notification);
      mockNotificationRepository.save.mockResolvedValue(notification);
      mockReceiptRepository.create.mockReturnValue(receipt);
      mockReceiptRepository.save.mockResolvedValue(receipt);
      mockDeviceTokenRepository.findOne.mockResolvedValue({ fcmToken: mockFcmToken });
      mockFirebaseMessaging.send.mockRejectedValue(new Error('Firebase error'));

      await expect(notificationService.sendNotification(
        mockUserProviderUid,
        'Test Title',
        'Test Body'
      )).rejects.toThrow(new AppError(500, 'Failed to send notification'));
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const receipt = {
        id: 'test-receipt-id',
        notificationId: 'test-notification-id',
        userProviderUid: mockUserProviderUid,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReceiptRepository.findOne.mockResolvedValue(receipt);
      mockReceiptRepository.save.mockResolvedValue({
        ...receipt,
        isRead: true,
        readAt: expect.any(Date),
      });

      await notificationService.markAsRead('test-notification-id', mockUserProviderUid);

      expect(mockReceiptRepository.findOne).toHaveBeenCalledWith({
        where: {
          notificationId: 'test-notification-id',
          userProviderUid: mockUserProviderUid,
        },
      });
      expect(mockReceiptRepository.save).toHaveBeenCalledWith({
        ...receipt,
        isRead: true,
        readAt: expect.any(Date),
      });
    });

    it('should throw error if receipt not found', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(null);

      await expect(notificationService.markAsRead('test-notification-id', mockUserProviderUid))
        .rejects.toThrow(new AppError(404, 'Notification receipt not found'));
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const notifications = [
        {
          id: 'test-notification-1',
          type: NotificationType.SYSTEM,
          title: 'Test Title 1',
          body: 'Test Body 1',
          userProviderUid: mockUserProviderUid,
          createdAt: new Date(),
          updatedAt: new Date(),
          receipts: [],
        },
        {
          id: 'test-notification-2',
          type: NotificationType.SYSTEM,
          title: 'Test Title 2',
          body: 'Test Body 2',
          userProviderUid: mockUserProviderUid,
          createdAt: new Date(),
          updatedAt: new Date(),
          receipts: [],
        },
      ];

      mockNotificationRepository.findAndCount.mockResolvedValue([notifications, 2]);

      const result = await notificationService.getUserNotifications(mockUserProviderUid, 1, 10);

      expect(mockNotificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userProviderUid: mockUserProviderUid },
        relations: ['receipts'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        notifications,
        total: 2,
        page: 1,
        limit: 10,
      });
    });
  });
}); 