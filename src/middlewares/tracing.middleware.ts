import { Request, Response, NextFunction } from 'express';
import { trace, SpanStatusCode, SpanKind, context, propagation } from '@opentelemetry/api';

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract trace context from incoming request headers
  const carrier: Record<string, string | string[] | undefined> = {};
  Object.keys(req.headers).forEach(key => {
    carrier[key.toLowerCase()] = req.headers[key];
  });
  
  const parentContext = propagation.extract(context.active(), carrier);
  
  const tracer = trace.getTracer('echo-be');
  const span = tracer.startSpan(
    `${req.method} ${req.path}`,
    {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path || req.path,
      }
    },
    parentContext
  );
  
  // Log trace ID and span ID
  console.log('Incoming Trace ID:', span.spanContext().traceId);
  console.log('Incoming Span ID:', span.spanContext().spanId);
  
  // Add trace ID to response headers
  res.setHeader('X-Trace-ID', span.spanContext().traceId);
  
  // End span when response is finished
  res.on('finish', () => {
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  });
  
  next();
}; 