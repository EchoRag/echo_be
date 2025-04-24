import dotenv from 'dotenv';
import app from './app';
import { AppDataSource } from './config/database';
import { initializeTelemetry, shutdownTelemetry } from './config/telemetry';
// import http from 'http';

dotenv.config();

const PORT = process.env.PORT || 3000;

console.log(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
console.log(process.env.OTEL_EXPORTER_OTLP_TOKEN);

const startServer = async () => {
  try {
    // Check if telemetry endpoint is accessible
    const isTelemetryAvailable = process.env.ENABLE_TELEMETRY === 'true';

    if (isTelemetryAvailable) {
      // Initialize OpenTelemetry only if endpoint is accessible
      await initializeTelemetry();
      console.log('Telemetry initialized successfully');
    } else {
      console.log('Telemetry endpoint not available, skipping initialization');
    }

    // Initialize database
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      if (isTelemetryAvailable) {
        await shutdownTelemetry();
      }
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Shutting down gracefully...');
      if (isTelemetryAvailable) {
        await shutdownTelemetry();
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer(); 