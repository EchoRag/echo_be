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

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Authentication
app.use(authenticateUser);
app.use(extractUser);

// Routes
app.use('/api/v1/project', projectRoutes);
app.use('/api/v1/documents', documentRoutes);


// Error handling
app.use(errorHandler);

// Database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((error) => {
    console.error('Error during Data Source initialization:', error);
  });

export default app; 
