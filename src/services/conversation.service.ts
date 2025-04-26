import { AppDataSource } from '../config/database';
import { Conversation } from '../models/conversation.model';
import { ConversationMessage } from '../models/conversation-message.model';
import { MessageVote } from '../models/MessageVote';
import { EchoConfig } from '../models/echo-config.model';
import { RequestQueue } from '../models/request-queue.model';
import { NotificationService } from './notification.service';
import { NotificationType } from '../models/notification.model';
import axios from 'axios';
import { In } from 'typeorm';

interface GenerateRequest {
  prompt: string;
  model: string;
  max_tokens: number;
  temperature: number;
  conversation_id: string;
}

export class ConversationService {
  private conversationRepository = AppDataSource.getRepository(Conversation);
  private messageRepository = AppDataSource.getRepository(ConversationMessage);
  private voteRepository = AppDataSource.getRepository(MessageVote);
  private echoConfigRepository = AppDataSource.getRepository(EchoConfig);
  private requestQueueRepository = AppDataSource.getRepository(RequestQueue);
  private notificationService = NotificationService.getInstance();

  async getConversationsByUser(userProviderUid: string): Promise<Conversation[]> {
    const conversations = await this.conversationRepository.find({
      where: { userProviderUid },
      order: { createdAt: 'DESC' }
    });

    // Get first message for each conversation
    for (const conversation of conversations) {
      const firstMessage = await this.messageRepository.findOne({
        where: { conversationId: conversation.id },
        order: { createdAt: 'ASC' },
        select: ['id', 'conversationId', 'role', 'content', 'createdAt']
      });
      conversation.messages = firstMessage ? [firstMessage] : [];
    }

    return conversations;
  }

  async getConversationHistory(conversationId: string, userProviderUid: string): Promise<ConversationMessage[]> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userProviderUid }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' }
    });
  }

  async voteMessage(messageId: string, userProviderUid: string, voteType: 'upvote' | 'downvote'): Promise<{ upvotes: number; downvotes: number }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingVote = await this.voteRepository.findOne({
        where: { message_id: messageId, user_provider_uid: userProviderUid }
      });

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await queryRunner.manager.remove(existingVote);
          await queryRunner.manager.update(ConversationMessage, messageId, {
            [voteType === 'upvote' ? 'upvotes' : 'downvotes']: () => `${voteType === 'upvote' ? 'upvotes' : 'downvotes'} - 1`
          });
        } else {
          // Change vote
          existingVote.vote_type = voteType;
          await queryRunner.manager.save(existingVote);
          await queryRunner.manager.update(ConversationMessage, messageId, {
            upvotes: () => voteType === 'upvote' ? 'upvotes + 1' : 'upvotes - 1',
            downvotes: () => voteType === 'downvote' ? 'downvotes + 1' : 'downvotes - 1'
          });
        }
      } else {
        // New vote
        const newVote = this.voteRepository.create({
          message_id: messageId,
          user_provider_uid: userProviderUid,
          vote_type: voteType
        });
        await queryRunner.manager.save(newVote);
        await queryRunner.manager.update(ConversationMessage, messageId, {
          [voteType === 'upvote' ? 'upvotes' : 'downvotes']: () => `${voteType === 'upvote' ? 'upvotes' : 'downvotes'} + 1`
        });
      }

      const updatedMessage = await queryRunner.manager.findOne(ConversationMessage, {
        where: { id: messageId }
      });

      await queryRunner.commitTransaction();

      return {
        upvotes: updatedMessage?.upvotes || 0,
        downvotes: updatedMessage?.downvotes || 0
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async isServerOnline(config: EchoConfig): Promise<boolean> {
    try {
      await axios.get(`${config.llmServerUrl}/health`, { 
        timeout: 5000,
        validateStatus: (status) => status < 500 // Consider any non-500 response as "online"
      });
      return true;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  }

  private async queueRequest(request: GenerateRequest, authHeader: string, userProviderUid: string): Promise<RequestQueue> {
    const queuedRequest = this.requestQueueRepository.create({
      userProviderUid,
      request,
      authHeader,
      status: 'pending'
    });

    return await this.requestQueueRepository.save(queuedRequest);
  }

  private async sendQueuedNotification(userProviderUid: string, conversationId: string, message: string): Promise<void> {
    await this.notificationService.sendNotification(
      userProviderUid,
      'Request Queued',
      message,
      NotificationType.SYSTEM,
      {
        type: 'request_queued',
        conversationId,
        link: `${process.env.FE_URL}/conversation/${conversationId}`
      }
    );
  }

  private async sendResponseReadyNotification(userProviderUid: string, conversationId: string): Promise<void> {
    await this.notificationService.sendNotification(
      userProviderUid,
      'Response Ready',
      'Your queued request has been processed',
      NotificationType.SYSTEM,
      {
        type: 'response_ready',
        conversationId,
        link: `${process.env.FE_URL}/conversation/${conversationId}`
      }
    );
  }

  private async processQueuedRequest(queuedRequest: RequestQueue): Promise<void> {
    const config = await this.echoConfigRepository.findOne({
      where: { isActive: true }
    });

    if (!config) {
      queuedRequest.status = 'failed';
      queuedRequest.lastError = 'No active LLM server configuration found';
      await this.requestQueueRepository.save(queuedRequest);
      return;
    }

    try {
      await axios.post(
        `${config.llmServerUrl}/generate`,
        queuedRequest.request,
        {
          headers: {
            'Authorization': queuedRequest.authHeader,
            'Content-Type': 'application/json'
          }
        }
      );

      queuedRequest.status = 'completed';
      await this.requestQueueRepository.save(queuedRequest);
      await this.sendResponseReadyNotification(queuedRequest.userProviderUid, queuedRequest.request.conversation_id);

    } catch (error) {
      queuedRequest.retryCount += 1;
      queuedRequest.lastError = error instanceof Error ? error.message : 'Unknown error';

      if (queuedRequest.retryCount >= 3) {
        queuedRequest.status = 'failed';
      }

      await this.requestQueueRepository.save(queuedRequest);
    }
  }

  async generateResponse(request: GenerateRequest, authHeader: string, userProviderUid: string): Promise<any> {
    const config = await this.echoConfigRepository.findOne({
      where: { isActive: true }
    });

    if (!config) {
      const queuedRequest = await this.queueRequest(request, authHeader, userProviderUid);
      await this.sendQueuedNotification(
        userProviderUid,
        request.conversation_id,
        'Your request has been queued due to missing server configuration'
      );

      return {
        status: 'queued',
        message: 'Request has been queued due to missing server configuration',
        queueId: queuedRequest.id
      };
    }

    const isOnline = await this.isServerOnline(config);

    if (!isOnline) {
      const queuedRequest = await this.queueRequest(request, authHeader, userProviderUid);
      await this.sendQueuedNotification(
        userProviderUid,
        request.conversation_id,
        'Your request has been queued and will be processed when the server is back online'
      );

      await this.echoConfigRepository.update(
        { isActive: true },
        { isActive: false }
      );

      return {
        status: 'queued',
        message: 'Request has been queued and will be processed when the server is back online',
        queueId: queuedRequest.id
      };
    }

    try {
      const response = await axios.post(
        `${config.llmServerUrl}/generate`,
        request,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 300000, // 5 minute timeout for generation
          maxContentLength: 50 * 1024 * 1024, // 50MB max response size
          maxBodyLength: 50 * 1024 * 1024, // 50MB max request size
          validateStatus: (status) => status < 500 // Consider any non-500 response as valid
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timed out after 30 seconds');
        }
        if (error.code === 'ECONNRESET') {
          throw new Error('Connection was reset by the server');
        }
        throw new Error(`LLM server error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  // Method to process queued requests (to be called by a background job)
  async processQueuedRequests(): Promise<void> {
    const pendingRequests = await this.requestQueueRepository.find({
      where: { status: In(['pending', 'failed']) },
      order: { createdAt: 'ASC' }
    });

    for (const request of pendingRequests) {
      await this.processQueuedRequest(request);
    }
  }
} 