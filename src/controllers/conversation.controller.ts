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

  /**
   * @swagger
   * /api/v1/conversations/messages/{message_id}/vote:
   *   post:
   *     summary: Vote on a message
   *     tags: [Conversations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: message_id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               vote_type:
   *                 type: string
   *                 enum: [like, dislike]
   *     responses:
   *       200:
   *         description: Updated vote counts
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 upvotes:
   *                   type: number
   *                 downvotes:
   *                   type: number
   *       400:
   *         description: Invalid vote type
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
  voteMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.providerUid) {
        throw new AppError(401, 'Unauthorized');
      }

      const { message_id } = req.params;
      const { vote_type } = req.body;

      if (vote_type !== 'like' && vote_type !== 'dislike') {
        throw new AppError(400, "Invalid vote type. Must be 'like' or 'dislike'");
      }

      const db_vote_type = vote_type === 'like' ? 'upvote' : 'downvote';
      const result = await this.conversationService.voteMessage(message_id, req.user.providerUid, db_vote_type);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
} 