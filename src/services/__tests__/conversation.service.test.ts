import { ConversationService } from '../conversation.service';
import { AppDataSource } from '../../config/database';
import { Conversation } from '../../models/conversation.model';
import { ConversationMessage } from '../../models/conversation-message.model';
import { MessageVote } from '../../models/MessageVote';
import { EchoConfig } from '../../models/echo-config.model';
import { RequestQueue } from '../../models/request-queue.model';
import { NotificationService } from '../notification.service';
import { User } from '../../models/user.model';
import axios from 'axios';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../notification.service');
jest.mock('axios');

describe('ConversationService', () => {
  let conversationService: ConversationService;
  let mockConversationRepository: any;
  let mockMessageRepository: any;
  let mockVoteRepository: any;
  let mockEchoConfigRepository: any;
  let mockRequestQueueRepository: any;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const mockUser: User = {
    id: 'test-user-id',
    providerUid: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    projects: [],
    conversations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversation: Conversation = {
    id: 'test-conversation-id',
    userProviderUid: mockUser.providerUid,
    user: mockUser,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage: ConversationMessage = {
    id: 'test-message-id',
    conversationId: mockConversation.id,
    conversation: mockConversation,
    role: 'user',
    content: 'Test message',
    upvotes: 0,
    downvotes: 0,
    embedding: [],
    createdAt: new Date(),
  };

  const mockEchoConfig: EchoConfig = {
    id: 'test-config-id',
    llmServerUrl: 'http://test-server.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup repository mocks
    mockConversationRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockMessageRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockVoteRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockEchoConfigRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockRequestQueueRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    // Mock queryRunner
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        remove: jest.fn(),
        update: jest.fn(),
        findOne: jest.fn().mockImplementation((entity, options) => {
          if (entity === ConversationMessage) {
            // For upvote test
            if (options.where.id === mockMessage.id) {
              return Promise.resolve({
                ...mockMessage,
                upvotes: 1,
                downvotes: 0
              });
            }
            // For remove vote test
            if (options.where.id === 'test-message-id-remove') {
              return Promise.resolve({
                ...mockMessage,
                id: 'test-message-id-remove',
                upvotes: 0,
                downvotes: 0
              });
            }
            // For downvote test
            if (options.where.id === 'test-message-id-2') {
              return Promise.resolve({
                ...mockMessage,
                id: 'test-message-id-2',
                upvotes: 0,
                downvotes: 1
              });
            }
          }
          return Promise.resolve(null);
        })
      }
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      switch (entity) {
        case Conversation:
          return mockConversationRepository;
        case ConversationMessage:
          return mockMessageRepository;
        case MessageVote:
          return mockVoteRepository;
        case EchoConfig:
          return mockEchoConfigRepository;
        case RequestQueue:
          return mockRequestQueueRepository;
        default:
          return null;
      }
    });

    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

    // Mock NotificationService
    mockNotificationService = {
      sendNotification: jest.fn(),
      getInstance: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<NotificationService>;
    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);

    // Create service instance
    conversationService = new ConversationService();
  });

  describe('getConversationsByUser', () => {
    it('should return conversations with first message', async () => {
      mockConversationRepository.find.mockResolvedValue([mockConversation]);
      mockMessageRepository.findOne.mockResolvedValue(mockMessage);

      const result = await conversationService.getConversationsByUser(mockUser.providerUid);

      expect(mockConversationRepository.find).toHaveBeenCalledWith({
        where: { userProviderUid: mockUser.providerUid },
        order: { createdAt: 'DESC' }
      });
      expect(mockMessageRepository.findOne).toHaveBeenCalledWith({
        where: { conversationId: mockConversation.id },
        order: { createdAt: 'ASC' },
        select: ['id', 'conversationId', 'role', 'content', 'createdAt']
      });
      expect(result).toEqual([{ ...mockConversation, messages: [mockMessage] }]);
    });

    it('should return conversations without messages if no messages found', async () => {
      mockConversationRepository.find.mockResolvedValue([mockConversation]);
      mockMessageRepository.findOne.mockResolvedValue(null);

      const result = await conversationService.getConversationsByUser(mockUser.providerUid);

      expect(result).toEqual([{ ...mockConversation, messages: [] }]);
    });
  });

  describe('getConversationHistory', () => {
    it('should return conversation messages', async () => {
      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockMessageRepository.find.mockResolvedValue([mockMessage]);

      const result = await conversationService.getConversationHistory(
        mockConversation.id,
        mockUser.providerUid
      );

      expect(mockConversationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockConversation.id, userProviderUid: mockUser.providerUid }
      });
      expect(mockMessageRepository.find).toHaveBeenCalledWith({
        where: { conversationId: mockConversation.id },
        order: { createdAt: 'ASC' }
      });
      expect(result).toEqual([mockMessage]);
    });

    it('should throw error if conversation not found', async () => {
      mockConversationRepository.findOne.mockResolvedValue(null);

      await expect(
        conversationService.getConversationHistory(mockConversation.id, mockUser.providerUid)
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('voteMessage', () => {
    it('should add new upvote', async () => {
      mockVoteRepository.findOne.mockResolvedValue(null);
      mockMessageRepository.findOne.mockResolvedValue({
        ...mockMessage,
        upvotes: 1,
        downvotes: 0
      });

      const result = await conversationService.voteMessage(
        mockMessage.id,
        mockUser.providerUid,
        'upvote'
      );

      expect(mockVoteRepository.create).toHaveBeenCalledWith({
        message_id: mockMessage.id,
        user_provider_uid: mockUser.providerUid,
        vote_type: 'upvote'
      });
      expect(result).toEqual({ upvotes: 1, downvotes: 0 });
    });

    it('should remove existing vote if same type', async () => {
      const messageId = 'test-message-id-remove';
      mockVoteRepository.findOne.mockResolvedValue({
        message_id: messageId,
        user_provider_uid: mockUser.providerUid,
        vote_type: 'upvote'
      });
      mockMessageRepository.findOne.mockResolvedValue({
        ...mockMessage,
        id: messageId,
        upvotes: 0,
        downvotes: 0
      });

      const result = await conversationService.voteMessage(
        messageId,
        mockUser.providerUid,
        'upvote'
      );

      expect(result).toEqual({ upvotes: 0, downvotes: 0 });
    });

    it('should change vote type if different', async () => {
      const messageId = 'test-message-id-2';
      mockVoteRepository.findOne.mockResolvedValue({
        message_id: messageId,
        user_provider_uid: mockUser.providerUid,
        vote_type: 'upvote'
      });
      mockMessageRepository.findOne.mockResolvedValue({
        ...mockMessage,
        id: messageId,
        upvotes: 0,
        downvotes: 1
      });

      const result = await conversationService.voteMessage(
        messageId,
        mockUser.providerUid,
        'downvote'
      );

      expect(result).toEqual({ upvotes: 0, downvotes: 1 });
    });
  });

  describe('generateResponse', () => {
    const mockRequest = {
      prompt: 'Test prompt',
      model: 'test-model',
      max_tokens: 100,
      temperature: 0.7,
      conversation_id: mockConversation.id
    };

    const mockAuthHeader = 'Bearer test-token';

    it('should queue request if no active config', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(null);
      const mockQueuedRequest = {
        id: 'test-queue-id',
        status: 'pending'
      };
      mockRequestQueueRepository.create.mockReturnValue(mockQueuedRequest);
      mockRequestQueueRepository.save.mockResolvedValue(mockQueuedRequest);

      const result = await conversationService.generateResponse(
        mockRequest,
        mockAuthHeader,
        mockUser.providerUid
      );

      expect(result).toEqual({
        status: 'queued',
        message: 'Request has been queued due to missing server configuration',
        queueId: 'test-queue-id'
      });
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });

    it('should queue request if server is offline', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(mockEchoConfig);
      (axios.get as jest.Mock).mockRejectedValue(new Error('Server offline'));
      const mockQueuedRequest = {
        id: 'test-queue-id',
        status: 'pending'
      };
      mockRequestQueueRepository.create.mockReturnValue(mockQueuedRequest);
      mockRequestQueueRepository.save.mockResolvedValue(mockQueuedRequest);

      // Mock console.error to prevent error output in tests
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const result = await conversationService.generateResponse(
        mockRequest,
        mockAuthHeader,
        mockUser.providerUid
      );

      // Restore console.error
      console.error = originalConsoleError;

      expect(result).toEqual({
        status: 'queued',
        message: 'Request has been queued and will be processed when the server is back online',
        queueId: 'test-queue-id'
      });
      expect(mockEchoConfigRepository.update).toHaveBeenCalledWith(
        { isActive: true },
        { isActive: false }
      );
    });

    it('should generate response if server is online', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(mockEchoConfig);
      (axios.get as jest.Mock).mockResolvedValue({ status: 200 });
      (axios.post as jest.Mock).mockResolvedValue({ data: { response: 'Test response' } });

      const result = await conversationService.generateResponse(
        mockRequest,
        mockAuthHeader,
        mockUser.providerUid
      );

      expect(result).toEqual({ response: 'Test response' });
      expect(axios.post).toHaveBeenCalledWith(
        `${mockEchoConfig.llmServerUrl}/generate`,
        mockRequest,
        expect.any(Object)
      );
    });

    it('should handle request timeout', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(mockEchoConfig);
      (axios.get as jest.Mock).mockResolvedValue({ status: 200 });
      const timeoutError = new Error('timeout of 30000ms exceeded') as Error & { code?: string };
      timeoutError.code = 'ECONNABORTED';
      (axios.post as jest.Mock).mockRejectedValue(timeoutError);

      await expect(
        conversationService.generateResponse(mockRequest, mockAuthHeader, mockUser.providerUid)
      ).rejects.toThrow('timeout of 30000ms exceeded');
    });
  });

  describe('processQueuedRequests', () => {
    it('should process pending requests', async () => {
      const mockQueuedRequest = {
        id: 'test-queue-id',
        status: 'pending',
        request: { conversation_id: mockConversation.id },
        userProviderUid: mockUser.providerUid,
        authHeader: 'Bearer test-token'
      };

      mockRequestQueueRepository.find.mockResolvedValue([mockQueuedRequest]);
      mockEchoConfigRepository.findOne.mockResolvedValue(mockEchoConfig);
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      await conversationService.processQueuedRequests();

      expect(mockRequestQueueRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: expect.any(Object)
        }),
        order: { createdAt: 'ASC' }
      });
      expect(mockRequestQueueRepository.save).toHaveBeenCalledWith({
        ...mockQueuedRequest,
        status: 'completed'
      });
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });

    it('should handle failed requests', async () => {
      const mockQueuedRequest = {
        id: 'test-queue-id',
        status: 'pending',
        request: { conversation_id: mockConversation.id },
        userProviderUid: mockUser.providerUid,
        authHeader: 'Bearer test-token',
        retryCount: 0
      };

      mockRequestQueueRepository.find.mockResolvedValue([mockQueuedRequest]);
      mockEchoConfigRepository.findOne.mockResolvedValue(mockEchoConfig);
      (axios.post as jest.Mock).mockRejectedValue(new Error('Request failed'));

      await conversationService.processQueuedRequests();

      expect(mockRequestQueueRepository.save).toHaveBeenCalledWith({
        ...mockQueuedRequest,
        retryCount: 1,
        lastError: 'Request failed'
      });
    });
  });
}); 