import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { AppDataSource } from './config/database';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middlewares/error.middleware';
import { rateLimiter } from './middlewares/rate-limit.middleware';
import { authenticateUser, extractUser } from './middlewares/auth.middleware';
import projectRoutes from './routes/project.routes';
import documentRoutes from './routes/document.routes';
import { RabbitMQService } from './services/rabbitmq.service';

const app = express();
const rabbitMQService = new RabbitMQService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Authentication
// app.use(authenticateUser);
// app.use(extractUser);

// Routes
app.use('/api/v1/project', projectRoutes);
app.use('/api/v1', documentRoutes);

// Error handling
app.use(errorHandler);

// Initialize connections
const initializeConnections = async () => {
  try {
    // Initialize database
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');

    // Initialize RabbitMQ
    await rabbitMQService.connect();
    console.log('RabbitMQ connection has been initialized!');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      await rabbitMQService.close();
      await AppDataSource.destroy();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
};

initializeConnections();

export default app; 