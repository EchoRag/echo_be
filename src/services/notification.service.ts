import { AppDataSource } from '../config/database';
import { Notification, NotificationType } from '../models/notification.model';
import { NotificationReceipt } from '../models/notification-receipt.model';
import { DeviceToken } from '../models/device-token.model';
import { AppError } from '../utils/app-error';
import * as admin from 'firebase-admin';
import path from 'path';
import { DocumentStatus } from '../models/document.model';

export class NotificationService {
  private static instance: NotificationService;
  private notificationRepository = AppDataSource.getRepository(Notification);
  private receiptRepository = AppDataSource.getRepository(NotificationReceipt);
  private deviceTokenRepository = AppDataSource.getRepository(DeviceToken);
  private firebaseAdmin: admin.app.App;

  private constructor() {
    // Initialize Firebase Admin with service account file
    let serviceAccountPath;
    if (process.env.firebase) {
      serviceAccountPath = JSON.parse(process.env.firebase);
    } else {
      serviceAccountPath = path.join(process.cwd(), 'service.json');
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
    deviceType?: string,
    deviceId?: string
  ): Promise<DeviceToken> {
    // Check if token already exists for this device
    const existingToken = await this.deviceTokenRepository.findOne({
      where: [
        { userProviderUid, fcmToken },
        { userProviderUid, deviceId }
      ]
    });

    if (existingToken) {
      // Update existing token
      existingToken.fcmToken = fcmToken;
      existingToken.deviceType = deviceType;
      existingToken.deviceId = deviceId;
      return await this.deviceTokenRepository.save(existingToken);
    }

    // Create new token
    const deviceToken = this.deviceTokenRepository.create({
      userProviderUid,
      fcmToken,
      deviceType,
      deviceId
    });

    return await this.deviceTokenRepository.save(deviceToken);
  }

  async sendDocumentStatusNotification(
    userProviderUid: string,
    documentId: string,
    projectId: string,
    status: DocumentStatus,
    errorDescription?: string
  ): Promise<Notification> {
    let title: string;
    let body: string;
    let type: NotificationType;

    switch (status) {
      case DocumentStatus.PROCESSED:
        title = 'Document Processed';
        body = 'Your document has been successfully processed';
        type = NotificationType.DOCUMENT_PROCESSED;
        break;
      case DocumentStatus.ERROR:
        title = 'Document Processing Failed';
        body = errorDescription || 'There was an error processing your document';
        type = NotificationType.DOCUMENT_ERROR;
        break;
      default:
        title = 'Document Status Updated';
        body = `Your document status has been updated to ${status}`;
        type = NotificationType.SYSTEM;
    }

    const data = {
      documentId,
      projectId,
      status,
      errorDescription,
      link: `http://localhost:5173/project/${projectId}`
    };

    return this.sendNotification(
      userProviderUid,
      title,
      body,
      type,
      data
    );
  }

  async sendNotification(
    userProviderUid: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.SYSTEM,
    data: Record<string, any> = {}
  ): Promise<Notification> {
    try {
      // Create notification record
      const notification = this.notificationRepository.create({
        type,
        title,
        body,
        data,
        userProviderUid,
      });
      await this.notificationRepository.save(notification);

      // Create receipt
      const receipt = this.receiptRepository.create({
        notificationId: notification.id,
        userProviderUid,
        isRead: false,
      });
      await this.receiptRepository.save(receipt);

      // Get user's FCM token
      const fcmToken = await this.getUserFcmToken(userProviderUid);

      if (fcmToken) {
        // Send web push notification
        await this.firebaseAdmin.messaging().send({
          token: fcmToken,
          webpush: {
            notification: {
              title,
              body,
              icon: 'https://your-app.com/icon.png',
              badge: 'https://your-app.com/badge.png',
              actions: [
                {
                  action: 'open',
                  title: 'View'
                }
              ]
            },
            fcmOptions: {
              link: data.link || 'http://localhost:5173'
            }
          },
          data: {
            notificationId: notification.id,
            type,
            ...data,
          },
        });
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new AppError(500, 'Failed to send notification');
    }
  }

  async markAsRead(notificationId: string, userProviderUid: string): Promise<void> {
    const receipt = await this.receiptRepository.findOne({
      where: {
        notificationId,
        userProviderUid,
      },
    });

    if (!receipt) {
      throw new AppError(404, 'Notification receipt not found');
    }

    receipt.isRead = true;
    receipt.readAt = new Date();
    await this.receiptRepository.save(receipt);
  }

  async getUserNotifications(
    userProviderUid: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ notifications: Notification[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepository.findAndCount({
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
      limit
    };
  }

  private async getUserFcmToken(userProviderUid: string): Promise<string | null> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { userProviderUid },
      order: { createdAt: 'DESC' }
    });
    return deviceToken?.fcmToken || null;
  }
} 