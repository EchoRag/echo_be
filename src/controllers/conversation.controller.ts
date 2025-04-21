import { Request, Response, NextFunction } from 'express';
import { ConversationService } from '../services/conversation.service';
import { AppError } from '../utils/app-error';

export class ConversationController {
  private conversationService = new ConversationService();

  /**
   * @swagger
   * /api/v1/conversations:
   *   get:
   *     summary: Get all conversations for the current user
   *     tags: [Conversations]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of conversations
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Conversation'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.providerUid) {
        throw new AppError(401, 'Unauthorized');
      }

      const conversations = await this.conversationService.getConversationsByUser(req.user.providerUid);
      res.json(conversations);
    } catch (error) {
      next(error);
    }
  };
} 