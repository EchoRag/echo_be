import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Set minimal logging for production
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'echo-be',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {
      Authorization: `Basic ${process.env.OTEL_EXPORTER_OTLP_token}` || '',
    },
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

export const initializeTelemetry = async (): Promise<void> => {
  try {
    await sdk.start();
  } catch (error) {
    console.error('Error initializing OpenTelemetry:', error);
  }
};

export const shutdownTelemetry = async (): Promise<void> => {
  try {
    await sdk.shutdown();
  } catch (error) {
    console.error('Error shutting down OpenTelemetry:', error);
  }
}; 