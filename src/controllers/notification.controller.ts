import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { AppError } from '../middlewares/error.middleware';

export class NotificationController {
  private notificationService = new NotificationService();

  /**
   * @swagger
   * /api/v1/notifications:
   *   post:
   *     summary: Send a notification
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - body
   *               - userProviderUid
   *             properties:
   *               title:
   *                 type: string
   *               body:
   *                 type: string
   *               userProviderUid:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [document_processed, document_error, system]
   *               data:
   *                 type: object
   */
  sendNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, body, userProviderUid, type, data } = req.body;
      
      if (!title || !body || !userProviderUid) {
        throw new AppError(400, 'Missing required fields');
      }

      const notification = await this.notificationService.sendNotification(
        userProviderUid,
        title,
        body,
        type,
        data
      );

      res.status(201).json(notification);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/notifications/{id}/read:
   *   put:
   *     summary: Mark a notification as read
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userProviderUid = req.user?.providerUid;

      if (!userProviderUid) {
        throw new AppError(401, 'User not authenticated');
      }

      await this.notificationService.markAsRead(id, userProviderUid);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/notifications:
   *   get:
   *     summary: Get user's notifications
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   */
  getUserNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userProviderUid = req.user?.providerUid;
      if (!userProviderUid) {
        throw new AppError(401, 'User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.notificationService.getUserNotifications(
        userProviderUid,
        page,
        limit
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/notifications/token:
   *   post:
   *     summary: Register a device token for push notifications
   *     tags: [Notifications]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fcmToken
   *               - userProviderUid
   *             properties:
   *               userProviderUid:
   *                 type: string
   *               fcmToken:
   *                 type: string
   *               deviceType:
   *                 type: string
   *               deviceId:
   *                 type: string
   */
  registerDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userProviderUid, fcmToken, deviceType, deviceId } = req.body;
      
      if (!userProviderUid || !fcmToken) {
        throw new AppError(400, 'userProviderUid and fcmToken are required');
      }

      const deviceToken = await this.notificationService.registerDeviceToken(
        userProviderUid,
        fcmToken,
        deviceType,
        deviceId
      );

      res.status(201).json(deviceToken);
    } catch (error) {
      next(error);
    }
  };
} 