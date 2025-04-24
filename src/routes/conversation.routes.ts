import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';
import { authenticateUser, extractUser } from '../middlewares/auth.middleware';

const router = Router();
const conversationController = new ConversationController();

// Apply authentication middleware to all routes
router.use(authenticateUser);
router.use(extractUser);

// Conversation Routes
router.get('/', conversationController.getConversations);
router.post('/messages/:message_id/vote', conversationController.voteMessage);

export default router; 