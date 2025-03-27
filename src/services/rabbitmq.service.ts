import amqp from 'amqplib';
import { AppError } from '../middlewares/error.middleware';

export class RabbitMQService {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;

  constructor() {
    this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  }

  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
      throw new AppError(500, 'Failed to connect to RabbitMQ');
    }
  }

  async publishMessage(queue: string, message: string) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel!.assertQueue(queue, { durable: true });
      this.channel!.sendToQueue(queue, Buffer.from(message));
      console.log(`Message published to queue: ${queue}`);
    } catch (error) {
      console.error('Error publishing message to RabbitMQ:', error);
      throw new AppError(500, 'Failed to publish message to RabbitMQ');
    }
  }

  async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
} 