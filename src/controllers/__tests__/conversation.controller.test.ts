import { Request, Response } from 'express';
import { ConversationController } from '../conversation.controller';
import { ConversationService } from '../../services/conversation.service';
import { AppError } from '../../utils/app-error';
import { Conversation } from '../../models/conversation.model';
import { ConversationMessage } from '../../models/conversation-message.model';
import { User } from '../../models/user.model';

// Mock the ConversationService
jest.mock('../../services/conversation.service');

describe('ConversationController', () => {
  let conversationController: ConversationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let mockConversationService: jest.Mocked<ConversationService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock response
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    // Setup mock request
    mockRequest = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        providerUid: 'test-user-id',
        projects: [],
        conversations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as User,
      headers: {
        authorization: 'Bearer test-token',
      },
    };

    nextFunction = jest.fn();

    // Get the mocked ConversationService instance
    mockConversationService = ConversationService.prototype as jest.Mocked<ConversationService>;
    conversationController = new ConversationController();
  });

  describe('getConversations', () => {
    it('should return conversations for authenticated user', async () => {
      const mockConversations: Partial<Conversation>[] = [{
        id: '1',
        userProviderUid: 'test-user-id',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          providerUid: 'test-user-id',
          projects: [],
          conversations: [],
          createdAt: new Date(),
          updatedAt: new Date()
        } as unknown as User,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      mockConversationService.getConversationsByUser.mockResolvedValue(mockConversations as Conversation[]);

      await conversationController.getConversations(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockConversationService.getConversationsByUser).toHaveBeenCalledWith('test-user-id');
      expect(mockResponse.json).toHaveBeenCalledWith(mockConversations);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw 401 error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await conversationController.getConversations(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(401);
    });
  });

  describe('voteMessage', () => {
    it('should handle like vote successfully', async () => {
      mockRequest.params = { message_id: 'test-message-id' };
      mockRequest.body = { vote_type: 'like' };
      const mockResult = { upvotes: 1, downvotes: 0 };
      mockConversationService.voteMessage.mockResolvedValue(mockResult);

      await conversationController.voteMessage(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockConversationService.voteMessage).toHaveBeenCalledWith(
        'test-message-id',
        'test-user-id',
        'upvote'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle dislike vote successfully', async () => {
      mockRequest.params = { message_id: 'test-message-id' };
      mockRequest.body = { vote_type: 'dislike' };
      const mockResult = { upvotes: 0, downvotes: 1 };
      mockConversationService.voteMessage.mockResolvedValue(mockResult);

      await conversationController.voteMessage(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockConversationService.voteMessage).toHaveBeenCalledWith(
        'test-message-id',
        'test-user-id',
        'downvote'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw 400 error for invalid vote type', async () => {
      mockRequest.params = { message_id: 'test-message-id' };
      mockRequest.body = { vote_type: 'invalid' };

      await conversationController.voteMessage(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(400);
    });

    it('should throw 401 error when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { message_id: 'test-message-id' };
      mockRequest.body = { vote_type: 'like' };

      await conversationController.voteMessage(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(401);
    });
  });

  describe('generateResponse', () => {
    it('should generate response successfully with default parameters', async () => {
      mockRequest.body = {
        prompt: 'Test prompt',
      };
      const mockServiceResponse = { response: 'Generated response' };
      mockConversationService.generateResponse.mockResolvedValue(mockServiceResponse);

      await conversationController.generateResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockConversationService.generateResponse).toHaveBeenCalledWith(
        {
          prompt: 'Test prompt',
          model: 'llama3.2',
          max_tokens: 1000,
          temperature: 0.7,
          conversation_id: '',
        },
        'Bearer test-token',
        'test-user-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockServiceResponse);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should generate response with custom parameters', async () => {
      mockRequest.body = {
        prompt: 'Test prompt',
        model: 'custom-model',
        max_tokens: 500,
        temperature: 0.5,
        conversation_id: 'test-conversation',
      };
      const mockServiceResponse = { response: 'Generated response' };
      mockConversationService.generateResponse.mockResolvedValue(mockServiceResponse);

      await conversationController.generateResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockConversationService.generateResponse).toHaveBeenCalledWith(
        {
          prompt: 'Test prompt',
          model: 'custom-model',
          max_tokens: 500,
          temperature: 0.5,
          conversation_id: 'test-conversation',
        },
        'Bearer test-token',
        'test-user-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockServiceResponse);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw 400 error when prompt is missing', async () => {
      mockRequest.body = {};

      await conversationController.generateResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(400);
    });

    it('should throw 401 error when authorization header is missing', async () => {
      mockRequest.body = { prompt: 'Test prompt' };
      mockRequest.headers = {};

      await conversationController.generateResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(401);
    });

    it('should throw 401 error when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { prompt: 'Test prompt' };

      await conversationController.generateResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(401);
    });
  });

  describe('getConversationHistory', () => {
    it('should return conversation history for authenticated user', async () => {
      mockRequest.params = { conversationId: 'test-conversation-id' };
      const mockMessages: Partial<ConversationMessage>[] = [{
        id: '1',
        content: 'Test message',
        conversationId: 'test-conversation-id',
        conversation: {} as Conversation,
        role: 'user',
        embedding: [],
        createdAt: new Date()
      }];
      mockConversationService.getConversationHistory.mockResolvedValue(mockMessages as ConversationMessage[]);

      await conversationController.getConversationHistory(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockConversationService.getConversationHistory).toHaveBeenCalledWith(
        'test-conversation-id',
        'test-user-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockMessages);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw 401 error when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { conversationId: 'test-conversation-id' };

      await conversationController.getConversationHistory(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect((nextFunction.mock.calls[0][0] as AppError).statusCode).toBe(401);
    });
  });
}); 