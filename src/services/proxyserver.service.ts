import { EchoConfig } from '../models/echo-config.model';
import { AppDataSource } from '../config/database';
import { ConversationService } from './conversation.service';
import axios from 'axios';

export class ProxyServerService {
  private echoConfigRepository = AppDataSource.getRepository(EchoConfig);

  async getActiveConfig(): Promise<EchoConfig | null> {
    return await this.echoConfigRepository.findOne({
      where: { isActive: true }
    });
  }

  async checkLLMServerHealth(): Promise<{ status: string; message: string; serverUrl?: string }> {
    try {
      const config = await this.echoConfigRepository.findOne({
        where: { isActive: true }
      });

      if (!config) {
        return {
          status: 'error',
          message: 'No active LLM server configuration found'
        };
      }

      try {
        await axios.get(`${config.llmServerUrl}/health`, { timeout: 5000 });
        return {
          status: 'ok',
          message: 'LLM server is online',
          serverUrl: config.llmServerUrl
        };
      } catch (error) {
        return {
          status: 'error',
          message: 'LLM server is offline',
          serverUrl: config.llmServerUrl
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to check LLM server status'
      };
    }
  }

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