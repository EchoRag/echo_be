import admin from 'firebase-admin';
import { AppDataSource } from '../config/database';
import { Notification, NotificationType } from '../models/notification.model';
import { NotificationReceipt } from '../models/notification-receipt.model';
import { DeviceToken } from '../models/device-token.model';
import { DocumentStatus } from '../models/document.model';
import { AppError } from '../utils/app-error';
import path from 'path';

export class NotificationService {
  private static instance: NotificationService;
  private NotificationRepository = AppDataSource.getRepository(Notification);
  private NotificationReceiptRepository = AppDataSource.getRepository(NotificationReceipt);
  private DeviceTokenRepository = AppDataSource.getRepository(DeviceToken);
  private firebaseAdmin: admin.app.App;

  constructor() {
    let serviceAccountPath;
    if (process.env.firebase) {
      serviceAccountPath = JSON.parse(process.env.firebase);
    } else {
      serviceAccountPath = path.join(process.cwd(), 'creds', 'service.json');
    }
    this.firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async registerDeviceToken(
    userProviderUid: string,
    fcmToken: string,
    deviceType: string,
    deviceId: string
  ): Promise<DeviceToken> {
    let deviceToken = await this.DeviceTokenRepository.findOne({
      where: { userProviderUid, deviceId },
    });

    if (deviceToken) {
      deviceToken.fcmToken = fcmToken;
    } else {
      deviceToken = this.DeviceTokenRepository.create({
        userProviderUid,
        fcmToken,
        deviceType,
        deviceId,
      });
    }

    return this.DeviceTokenRepository.save(deviceToken);
  }

  async sendDocumentStatusNotification(
    userProviderUid: string,
    documentId: string,
    projectId: string,
    status: DocumentStatus,
    documentName: string,
    errorDescription?: string
  ): Promise<Notification> {
    let title: string;
    let body: string;
    let type: NotificationType;
    let data: any;

    switch (status) {
      case DocumentStatus.PROCESSED:
        title = 'Document Processed';
        body = `"${documentName}" has been successfully processed`;
        type = NotificationType.DOCUMENT_PROCESSED;
        data = {
          documentId,
          projectId,
          status,
          link: `${process.env.FE_URL}/projects/${projectId}`,
        };
        break;
      case DocumentStatus.ERROR:
        title = 'Document Processing Failed';
        body = errorDescription || 'An error occurred while processing the document';
        type = NotificationType.DOCUMENT_ERROR;
        data = {
          documentId,
          projectId,
          status,
          errorDescription,
          link: `${process.env.FE_URL}/projects/${projectId}`,
        };
        break;
      default:
        throw new AppError(400, 'Invalid document status');
    }

    return this.sendNotification(userProviderUid, title, body, type, data);
  }

  async sendNotification(
    userProviderUid: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.SYSTEM,
    data: any = {}
  ): Promise<Notification> {
    try {
      // Create and save notification
      const notification = this.NotificationRepository.create({
        type,
        title,
        body,
        data,
        userProviderUid,
      });
      const savedNotification = await this.NotificationRepository.save(notification);

      // Create and save receipt
      const receipt = this.NotificationReceiptRepository.create({
        notificationId: savedNotification.id,
        userProviderUid,
        isRead: false,
      });
      await this.NotificationReceiptRepository.save(receipt);

      // Get user's FCM token
      const deviceToken = await this.DeviceTokenRepository.findOne({
        where: { userProviderUid },
      });

      if (deviceToken?.fcmToken) {
        // Send FCM notification
        await this.firebaseAdmin.messaging().send({
          token: deviceToken.fcmToken,
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            type: type.toString(),
          },
        });
      }

      return savedNotification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new AppError(500, 'Failed to send notification');
    }
  }

  async markAsRead(notificationId: string, userProviderUid: string): Promise<void> {
    const receipt = await this.NotificationReceiptRepository.findOne({
      where: { notificationId, userProviderUid },
    });

    if (!receipt) {
      throw new AppError(404, 'Notification receipt not found');
    }

    receipt.isRead = true;
    receipt.readAt = new Date();
    await this.NotificationReceiptRepository.save(receipt);
  }

  async getUserNotifications(
    userProviderUid: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ notifications: Notification[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.NotificationRepository.findAndCount({
      where: { userProviderUid },
      relations: ['receipts'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      notifications,
      total,
      page,
      limit,
    };
  }
} 