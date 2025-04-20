import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateUser, extractUser, authenticateService } from '../middlewares/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// Notification Routes
router.post('/', 
  authenticateService, 
  notificationController.sendNotification
);

// Token registration without authentication
router.post('/token',
  notificationController.registerDeviceToken
);

// Routes requiring user authentication
router.put('/:id/read', 
  authenticateUser,
  extractUser,
  notificationController.markAsRead
);

router.get('/', 
  authenticateUser,
  extractUser,
  notificationController.getUserNotifications
);

export default router; 