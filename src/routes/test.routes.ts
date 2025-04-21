import { Router } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const router = Router();

router.get('/test-trace', async (req, res) => {
  const tracer = trace.getTracer('test-tracer');
  
  // Create a parent span
  const parentSpan = tracer.startSpan('test-parent-operation');
  
  try {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create a child span
    const childSpan = tracer.startSpan('test-child-operation', {
      parent: parentSpan
    });
    
    try {
      // Simulate more work
      await new Promise(resolve => setTimeout(resolve, 50));
      childSpan.setStatus({ code: SpanStatusCode.OK });
    } finally {
      childSpan.end();
    }
    
    parentSpan.setStatus({ code: SpanStatusCode.OK });
    res.json({ message: 'Tracing test successful' });
  } catch (error) {
    parentSpan.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Tracing test failed' });
  } finally {
    parentSpan.end();
  }
});

export default router; 