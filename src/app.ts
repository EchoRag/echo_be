import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { AppDataSource } from './config/database';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middlewares/error.middleware';
import { rateLimiter } from './middlewares/rate-limit.middleware';
import { traceMiddleware } from './middlewares/tracing.middleware';
import { telemetryMiddleware } from './middlewares/telemetry.middleware';
import projectRoutes from './routes/project.routes';
import documentRoutes from './routes/document.routes';
import conversationRoutes from './routes/conversation.routes';
import notificationRoutes from './routes/notification.routes';
import testRoutes from './routes/test.routes';
import { RabbitMQService } from './services/rabbitmq.service';
import logger from './config/logger';

const app = express();
const rabbitMQService = new RabbitMQService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimiter);
// app.use(traceMiddleware);
app.use(telemetryMiddleware);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Authentication
// app.use(authenticateUser);
// app.use(extractUser);

// Routes
app.use('/api/v1/project', projectRoutes);
app.use('/api/v1/document', documentRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/test', testRoutes);

// Error Handling
app.use(errorHandler);

// Initialize connections
const initializeConnections = async () => {
  try {
    // Initialize database
    await AppDataSource.initialize();
    logger.info('Data Source has been initialized!');

    // Initialize RabbitMQ
    await rabbitMQService.connect();
    logger.info('RabbitMQ connection has been initialized!');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      await rabbitMQService.close();
      await AppDataSource.destroy();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during initialization:', error);
    process.exit(1);
  }
};

initializeConnections();

export default app; 
