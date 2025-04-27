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

  /**
   * @swagger
   * /api/v1/conversations/generate:
   *   post:
   *     tags:
   *       - Conversations
   *     summary: Generate a response from the LLM server
   *     description: Send a prompt to the active LLM server and get a response
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - prompt
   *             properties:
   *               prompt:
   *                 type: string
   *                 description: The prompt to send to the LLM server
   *               model:
   *                 type: string
   *                 description: The model to use (defaults to llama3.2)
   *                 default: llama3.2
   *               max_tokens:
   *                 type: integer
   *                 description: Maximum number of tokens to generate (defaults to 1000)
   *                 default: 1000
   *               temperature:
   *                 type: number
   *                 description: Temperature for response generation (defaults to 0.7)
   *                 default: 0.7
   *               conversation_id:
   *                 type: string
   *                 description: ID of the conversation (optional)
   *     responses:
   *       200:
   *         description: Response generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 response:
   *                   type: string
   *                   description: The generated response
   *       400:
   *         description: Bad request - prompt is required
   *       401:
   *         description: Unauthorized - Authorization header is required
   *       503:
   *         description: Service unavailable - No active LLM server found
   *       500:
   *         description: Internal server error
   */
  generateResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.providerUid) {
        throw new AppError(401, 'Unauthorized');
      }

      const { prompt, model, max_tokens, temperature, conversation_id } = req.body;
      const authHeader = req.headers.authorization;

      if (!prompt) {
        throw new AppError(400, 'prompt is required');
      }

      if (!authHeader) {
        throw new AppError(401, 'Authorization header is required');
      }

      // Set default values if not provided
      const request = {
        prompt,
        model: model || 'llama3.2',
        max_tokens: max_tokens || 1000,
        temperature: temperature || 0.7,
        conversation_id: conversation_id || ''
      };

      const response = await this.conversationService.generateResponse(request, authHeader, req.user.providerUid);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/conversations/{conversationId}/history:
   *   get:
   *     summary: Get conversation history
   *     tags: [Conversations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: conversationId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of messages in the conversation
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ConversationMessage'
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Conversation not found
   *       500:
   *         description: Server error
   */
  getConversationHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.providerUid) {
        throw new AppError(401, 'Unauthorized');
      }

      const { conversationId } = req.params;
      const messages = await this.conversationService.getConversationHistory(conversationId, req.user.providerUid);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  };
} 