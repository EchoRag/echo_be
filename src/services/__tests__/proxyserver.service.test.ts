import { ProxyServerService } from '../proxyserver.service';
import { AppDataSource } from '../../config/database';
import { EchoConfig } from '../../models/echo-config.model';
import { ConversationService } from '../conversation.service';
import axios from 'axios';

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../conversation.service');
jest.mock('axios');

describe('ProxyServerService', () => {
  let proxyServerService: ProxyServerService;
  let mockEchoConfigRepository: any;
  let mockConversationService: jest.Mocked<ConversationService>;

  const mockConfig: EchoConfig = {
    id: 'test-config-id',
    llmServerUrl: 'http://test-server:8000',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup repository mock
    mockEchoConfigRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockEchoConfigRepository);

    // Mock ConversationService
    mockConversationService = {
      processQueuedRequests: jest.fn(),
    } as unknown as jest.Mocked<ConversationService>;
    (ConversationService as jest.Mock).mockImplementation(() => mockConversationService);

    // Create service instance
    proxyServerService = new ProxyServerService();
  });

  describe('getActiveConfig', () => {
    it('should return active config if found', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(mockConfig);

      const result = await proxyServerService.getActiveConfig();

      expect(mockEchoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should return null if no active config found', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(null);

      const result = await proxyServerService.getActiveConfig();

      expect(mockEchoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(result).toBeNull();
    });
  });

  describe('checkLLMServerHealth', () => {
    it('should return ok status when server is healthy', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(mockConfig);
      (axios.get as jest.Mock).mockResolvedValue({ status: 200 });

      const result = await proxyServerService.checkLLMServerHealth();

      expect(mockEchoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(axios.get).toHaveBeenCalledWith(
        `${mockConfig.llmServerUrl}/health`,
        { timeout: 5000 }
      );
      expect(result).toEqual({
        status: 'ok',
        message: 'LLM server is online',
        serverUrl: mockConfig.llmServerUrl,
      });
    });

    it('should return error status when server is offline', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(mockConfig);
      (axios.get as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await proxyServerService.checkLLMServerHealth();

      expect(mockEchoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(axios.get).toHaveBeenCalledWith(
        `${mockConfig.llmServerUrl}/health`,
        { timeout: 5000 }
      );
      expect(result).toEqual({
        status: 'error',
        message: 'LLM server is offline',
        serverUrl: mockConfig.llmServerUrl,
      });
    });

    it('should return error when no active config found', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(null);

      const result = await proxyServerService.checkLLMServerHealth();

      expect(mockEchoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(axios.get).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'error',
        message: 'No active LLM server configuration found',
      });
    });
  });

  describe('registerServer', () => {
    it('should reject localhost:8001', async () => {
      await expect(proxyServerService.registerServer('http://localhost:8001'))
        .rejects.toThrow('localhost:8001 is not allowed as an LLM server');
    });

    it('should update existing config if URL exists', async () => {
      const existingConfig = { ...mockConfig, isActive: false };
      mockEchoConfigRepository.findOne.mockResolvedValue(existingConfig);
      mockEchoConfigRepository.save.mockResolvedValue({ ...existingConfig, isActive: true });

      const result = await proxyServerService.registerServer(mockConfig.llmServerUrl);

      expect(mockEchoConfigRepository.update).toHaveBeenCalledWith({}, { isActive: false });
      expect(mockEchoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { llmServerUrl: mockConfig.llmServerUrl },
      });
      expect(mockEchoConfigRepository.save).toHaveBeenCalledWith({
        ...existingConfig,
        isActive: true,
      });
      expect(mockConversationService.processQueuedRequests).toHaveBeenCalled();
      expect(result).toEqual({ ...existingConfig, isActive: true });
    });

    it('should create new config if URL does not exist', async () => {
      mockEchoConfigRepository.findOne.mockResolvedValue(null);
      const newConfig = {
        llmServerUrl: 'http://new-server:8000',
        isActive: true,
      };
      mockEchoConfigRepository.create.mockReturnValue(newConfig);
      mockEchoConfigRepository.save.mockResolvedValue({
        ...newConfig,
        id: 'new-config-id',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      const result = await proxyServerService.registerServer(newConfig.llmServerUrl);

      expect(mockEchoConfigRepository.update).toHaveBeenCalledWith({}, { isActive: false });
      expect(mockEchoConfigRepository.findOne).toHaveBeenCalledWith({
        where: { llmServerUrl: newConfig.llmServerUrl },
      });
      expect(mockEchoConfigRepository.create).toHaveBeenCalledWith(newConfig);
      expect(mockEchoConfigRepository.save).toHaveBeenCalledWith(newConfig);
      expect(mockConversationService.processQueuedRequests).toHaveBeenCalled();
      expect(result).toEqual({
        ...newConfig,
        id: 'new-config-id',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
}); 