import { EchoConfig } from '../models/echo-config.model';
import { AppDataSource } from '../config/database';
import { ConversationService } from './conversation.service';

export class ProxyServerService {
  private echoConfigRepository = AppDataSource.getRepository(EchoConfig);

  async registerServer(llmServerUrl: string): Promise<EchoConfig> {
    // Reject localhost:8001
    if (llmServerUrl === 'http://localhost:8001') {
      throw new Error('localhost:8001 is not allowed as an LLM server');
    }

    // Deactivate all existing configs
    await this.echoConfigRepository.update({}, { isActive: false });

    // Check if this URL already exists
    let config = await this.echoConfigRepository.findOne({
      where: { llmServerUrl }
    });
    const conversationService = new ConversationService();

    if (config) {
      // Update existing config
      config.isActive = true;
      const status = await this.echoConfigRepository.save(config);
      conversationService.processQueuedRequests();
      return status;
    }

    // Create new config
    config = this.echoConfigRepository.create({
      llmServerUrl,
      isActive: true
    });
    const status = await this.echoConfigRepository.save(config);
    conversationService.processQueuedRequests();
    return status;
  }
} 