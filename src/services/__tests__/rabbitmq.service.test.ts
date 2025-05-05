import { RabbitMQService } from '../rabbitmq.service';
import amqp from 'amqplib';
import { AppError } from '../../utils/app-error';

// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe('RabbitMQService', () => {
  let rabbitMQService: RabbitMQService;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock channel
    mockChannel = {
      assertQueue: jest.fn(),
      sendToQueue: jest.fn(),
      close: jest.fn(),
    };

    // Setup mock connection
    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
    };

    // Mock amqp.connect
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    // Create service instance
    rabbitMQService = new RabbitMQService();
  });

  describe('connect', () => {
    it('should connect to RabbitMQ successfully', async () => {
      await rabbitMQService.connect();

      expect(amqp.connect).toHaveBeenCalledWith(expect.any(String));
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Connected to RabbitMQ');
    });

    it('should throw error when connection fails', async () => {
      const error = new Error('Connection failed');
      (amqp.connect as jest.Mock).mockRejectedValue(error);

      await expect(rabbitMQService.connect()).rejects.toThrow(
        new AppError(500, 'Failed to connect to RabbitMQ')
      );
      expect(console.error).toHaveBeenCalledWith('Error connecting to RabbitMQ:', error);
    });
  });

  describe('publishMessage', () => {
    const queue = 'test-queue';
    const message = 'test-message';

    it('should publish message successfully when already connected', async () => {
      // First connect
      await rabbitMQService.connect();

      // Then publish
      await rabbitMQService.publishMessage(queue, message);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(queue, Buffer.from(message));
      expect(console.log).toHaveBeenCalledWith(`Message published to queue: ${queue}`);
    });

    it('should connect and publish message when not connected', async () => {
      await rabbitMQService.publishMessage(queue, message);

      expect(amqp.connect).toHaveBeenCalled();
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(queue, Buffer.from(message));
      expect(console.log).toHaveBeenCalledWith(`Message published to queue: ${queue}`);
    });

    it('should throw error when publishing fails', async () => {
      // First connect to establish the channel
      await rabbitMQService.connect();
      
      const error = new Error('Publish failed');
      mockChannel.sendToQueue.mockRejectedValue(error);

      await expect(rabbitMQService.publishMessage(queue, message)).rejects.toThrow(
        new AppError(500, 'Failed to publish message to RabbitMQ')
      );
      expect(console.error).toHaveBeenCalledWith('Error publishing message to RabbitMQ:', error);
    });

    it('should throw error when connection fails during publish', async () => {
      const error = new Error('Connection failed');
      (amqp.connect as jest.Mock).mockRejectedValue(error);

      await expect(rabbitMQService.publishMessage(queue, message)).rejects.toThrow(
        new AppError(500, 'Failed to publish message to RabbitMQ')
      );
      
      expect(console.error).toHaveBeenNthCalledWith(1, 'Error connecting to RabbitMQ:', error);
      expect(console.error).toHaveBeenNthCalledWith(2, 'Error publishing message to RabbitMQ:', expect.any(Error));
    });
  });

  describe('close', () => {
    it('should close connection and channel successfully', async () => {
      // First connect
      await rabbitMQService.connect();

      // Then close
      await rabbitMQService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle errors during close gracefully', async () => {
      // First connect
      await rabbitMQService.connect();

      // Mock error during close
      const error = new Error('Close failed');
      mockChannel.close.mockRejectedValue(error);

      // Should not throw
      await expect(rabbitMQService.close()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledWith('Error closing RabbitMQ connection:', error);
    });

    it('should handle close when not connected', async () => {
      // Should not throw when closing without connection
      await expect(rabbitMQService.close()).resolves.not.toThrow();
    });
  });
}); 