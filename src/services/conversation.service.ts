import { AppDataSource } from '../config/database';
import { Conversation } from '../models/conversation.model';
import { ConversationMessage } from '../models/conversation-message.model';

export class ConversationService {
  private conversationRepository = AppDataSource.getRepository(Conversation);
  private messageRepository = AppDataSource.getRepository(ConversationMessage);

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
} 