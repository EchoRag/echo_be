import { EchoConfig } from '../models/echo-config.model';
import { AppDataSource } from '../config/database';
import axios from 'axios';

interface GenerateRequest {
  prompt: string;
  model: string;
  max_tokens: number;
  temperature: number;
  conversation_id: string;
}

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

    if (config) {
      // Update existing config
      config.isActive = true;
      return await this.echoConfigRepository.save(config);
    }

    // Create new config
    config = this.echoConfigRepository.create({
      llmServerUrl,
      isActive: true
    });

    return await this.echoConfigRepository.save(config);
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