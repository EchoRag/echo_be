import { AppDataSource } from '../config/database';
import { Conversation } from '../models/conversation.model';
import { ConversationMessage } from '../models/conversation-message.model';
import { MessageVote } from '../models/MessageVote';
import { EchoConfig } from '../models/echo-config.model';
import axios from 'axios';

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

  async generateResponse(request: GenerateRequest, authHeader: string): Promise<any> {
    // Get the active LLM server configuration
    const config = await this.echoConfigRepository.findOne({
      where: { isActive: true }
    });

    if (!config) {
      throw new Error('No active LLM server configuration found');
    }

    try {
      const response = await axios.post(
        `${config.llmServerUrl}/generate`,
        request,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`LLM server error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }
} 