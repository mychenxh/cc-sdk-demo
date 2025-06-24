/**
 * Enhanced Features Preview
 * This file demonstrates how the new streaming, error handling, and retry features would work
 * NOTE: This is a preview - these features are not yet implemented
 */

import { 
  claude, 
  RateLimitError, 
  ToolPermissionError,
  ContextLengthExceededError,
  AuthenticationError
} from '@instantlyeasy/claude-code-sdk-ts';

// 🌊 Enhanced Streaming Control Example
async function enhancedStreamingDemo() {
  console.log('=== Enhanced Streaming Demo ===\n');
  
  // Token-level streaming for real-time UI
  const stream = await claude()
    .withModel('opus')
    .query('Write a detailed analysis of climate change impacts')
    .asTokenStream();
  
  const controller = stream.getController();
  const ui = new RealTimeUI();
  
  try {
    for await (const token of stream.tokens()) {
      // Update UI with each token
      ui.appendToken(token.token);
      
      // Show progress
      const metrics = stream.getMetrics();
      ui.updateProgress({
        tokensPerSecond: metrics.averageTokensPerSecond,
        totalTokens: metrics.tokensEmitted
      });
      
      // Handle user controls
      if (ui.isPauseRequested()) {
        controller.pause();
        await ui.waitForResume();
        controller.resume();
      }
      
      if (ui.isCancelRequested()) {
        controller.abort('User cancelled');
      }
    }
  } catch (error) {
    if (error instanceof StreamAbortedError) {
      console.log('Stream aborted:', error.reason);
      // Show partial results
      const snapshot = stream.getSnapshot();
      ui.showPartialResult(snapshot);
    }
  }
}

// 🚨 Typed Error Handling Example
async function typedErrorHandlingDemo() {
  console.log('\n=== Typed Error Handling Demo ===\n');
  
  try {
    const result = await claude()
      .withModel('opus')
      .allowTools('Read', 'Write', 'Edit')
      .query('Analyze and modify all files in the project')
      .asText();
      
    console.log(result);
  } catch (error) {
    // Specific error handling
    if (error instanceof RateLimitError) {
      console.log(`Rate limited! Retry after ${error.retryAfter} seconds`);
      console.log(`Limit: ${error.limit}, Remaining: ${error.remaining}`);
      
      // Auto-retry after suggested time
      await sleep(error.retryAfter * 1000);
      return typedErrorHandlingDemo(); // Retry
      
    } else if (error instanceof ToolPermissionError) {
      console.log(`Tool permission denied: ${error.tool}`);
      console.log(`Action: ${error.action}, Reason: ${error.reason}`);
      
      // Try without the denied tool
      const retryResult = await claude()
        .withModel('opus')
        .allowTools('Read', 'Write', 'Edit')
        .denyToolsForThisCall(error.tool) // Exclude the problematic tool
        .query('Analyze files without modifying them')
        .asText();
        
    } else if (error instanceof ContextLengthExceededError) {
      console.log(`Context too long: ${error.currentTokens}/${error.maxTokens} tokens`);
      
      // Implement sliding window or summarization
      const chunks = splitIntoChunks(prompt, error.maxTokens * 0.8);
      const results = await processChunks(chunks);
      
    } else if (error instanceof AuthenticationError) {
      console.log(`Auth failed: ${error.message}`);
      console.log('Please run: claude login');
      process.exit(1);
    }
  }
}

// 🔧 Per-Call Tool Permissions Example
async function perCallPermissionsDemo() {
  console.log('\n=== Per-Call Permissions Demo ===\n');
  
  // Base configuration with strict permissions
  const baseBuilder = claude()
    .withModel('sonnet')
    .allowTools('Read', 'Grep')  // Very limited by default
    .denyTools('Write', 'Edit', 'Delete', 'Bash');
  
  // Task 1: Read-only analysis
  const analysis = await baseBuilder
    .query('Analyze the codebase structure')
    .asText();
  
  console.log('Read-only analysis completed');
  
  // Task 2: Temporary write permission for specific task
  const documentation = await baseBuilder
    .query('Update the README.md with analysis results')
    .allowToolsForThisCall('Write', 'Edit')  // Temporarily allow writing
    .asText();
  
  console.log('Documentation updated with temporary permissions');
  
  // Task 3: Dynamic permissions based on context
  const userRole = getUserRole();
  const sensitiveOp = await baseBuilder
    .query('Perform system maintenance')
    .withDynamicPermissions((context) => {
      // Permissions based on time, user role, and prompt content
      const isBusinessHours = new Date().getHours() >= 9 && new Date().getHours() < 17;
      const isSafePrompt = !context.prompt.includes('delete') && !context.prompt.includes('remove');
      
      if (userRole === 'admin' && isBusinessHours && isSafePrompt) {
        return {
          allowed: ['Bash', 'Write'],
          denied: ['Delete']
        };
      } else {
        return {
          denied: ['Bash', 'Write', 'Delete']
        };
      }
    })
    .asText();
}

// 📊 OpenTelemetry Integration Example
async function telemetryDemo() {
  console.log('\n=== OpenTelemetry Integration Demo ===\n');
  
  // Initialize OpenTelemetry
  const { trace, metrics } = require('@opentelemetry/api');
  const { OpenTelemetryLogger } = require('@instantlyeasy/claude-code-sdk-ts/telemetry');
  
  const telemetryLogger = new OpenTelemetryLogger(
    trace.getTracer('my-app'),
    metrics.getMeter('my-app')
  );
  
  // Use with Claude SDK
  const result = await claude()
    .withLogger(telemetryLogger)
    .withModel('opus')
    .query('Complex multi-step task')
    .asText();
  
  // Automatic tracing:
  // - Query duration
  // - Token usage
  // - Tool executions
  // - Error rates
  
  // Custom metrics
  telemetryLogger.recordMetric('custom_task_completed', 1, {
    model: 'opus',
    task_type: 'complex'
  });
}

// 🔄 Exponential Backoff Example
async function exponentialBackoffDemo() {
  console.log('\n=== Exponential Backoff Demo ===\n');
  
  // Simple retry with defaults
  const result1 = await claude()
    .withModel('opus')
    .query('API call that might fail')
    .withRetry()  // Default: 3 attempts, exponential backoff
    .asText();
  
  // Custom retry configuration
  const result2 = await claude()
    .withModel('opus')
    .query('Critical operation')
    .withRetry({
      maxAttempts: 5,
      initialDelay: 2000,  // Start with 2s
      maxDelay: 30000,     // Cap at 30s
      multiplier: 1.5,     // 2s, 3s, 4.5s, 6.75s, 10.125s
      jitter: true,        // Add randomness to prevent thundering herd
      retryableErrors: [
        RateLimitError,
        NetworkError,
        TimeoutError
      ],
      onRetry: (attempt, error, nextDelay) => {
        console.log(`Retry attempt ${attempt} after ${nextDelay}ms`);
        console.log(`Error: ${error.message}`);
        
        // Could update UI or send telemetry
        updateRetryUI(attempt, nextDelay);
        telemetry.recordRetry(attempt, error);
      }
    })
    .asText();
  
  // Circuit breaker pattern
  const circuitBreaker = claude()
    .withModel('opus')
    .withCircuitBreaker({
      failureThreshold: 5,    // Open circuit after 5 failures
      resetTimeout: 60000,    // Try again after 1 minute
      halfOpenLimit: 3        // Allow 3 requests in half-open state
    });
  
  try {
    const result = await circuitBreaker
      .query('External API dependent task')
      .asText();
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.log('Circuit is open, failing fast');
      // Return cached result or degraded response
      return getCachedResult();
    }
  }
}

// 🎯 Complete Real-World Example
async function realWorldExample() {
  console.log('\n=== Real-World Example: Document Processing Pipeline ===\n');
  
  // Configure telemetry
  const telemetry = new OpenTelemetryLogger(
    trace.getTracer('doc-processor'),
    metrics.getMeter('doc-processor')
  );
  
  // Base configuration with role
  const processor = claude()
    .withLogger(telemetry)
    .withConfigFile('./config/yaml/mcpconfig.yaml')
    .withRolesFile('./config/yaml/roles.yaml')
    .withRole('dataAnalyst', {
      domain: 'financial',
      specialty: 'reports'
    })
    .withRetry({
      maxAttempts: 3,
      initialDelay: 1000,
      retryableErrors: [RateLimitError, NetworkError]
    });
  
  // Process documents with streaming UI
  const documents = await getDocumentsToProcess();
  const ui = new DocumentProcessorUI();
  
  for (const doc of documents) {
    try {
      // Start processing with appropriate permissions
      const stream = await processor
        .query(`Analyze and summarize: ${doc.title}`)
        .allowToolsForThisCall('Read', 'Analyze')
        .denyToolsForThisCall('Write')  // Read-only for analysis
        .asTokenStream();
      
      const controller = stream.getController();
      let summary = '';
      
      // Stream tokens to UI
      for await (const token of stream.tokens()) {
        summary += token.token;
        ui.updateDocumentProgress(doc.id, {
          tokens: stream.getMetrics().tokensEmitted,
          preview: summary.slice(-100)  // Show last 100 chars
        });
        
        // Allow cancellation
        if (ui.isDocumentCancelled(doc.id)) {
          controller.abort(`Document ${doc.id} cancelled`);
          break;
        }
      }
      
      // Save summary with write permissions
      await processor
        .query(`Save summary to ${doc.summaryPath}`)
        .allowToolsForThisCall('Write')  // Temporary write permission
        .withTimeout(5000)  // Quick operation
        .asText();
      
      ui.markDocumentComplete(doc.id);
      
    } catch (error) {
      // Typed error handling
      if (error instanceof RateLimitError) {
        ui.showRateLimitWarning(error.retryAfter);
        await sleep(error.retryAfter * 1000);
        documents.unshift(doc);  // Retry this document
        
      } else if (error instanceof ContextLengthExceededError) {
        ui.showError(doc.id, 'Document too large, splitting...');
        const chunks = await splitDocument(doc, error.maxTokens * 0.5);
        documents.unshift(...chunks);
        
      } else if (error instanceof StreamAbortedError) {
        ui.showWarning(doc.id, 'Processing cancelled');
        
      } else {
        ui.showError(doc.id, error.message);
        telemetry.recordMetric('document_processing_error', 1, {
          error_type: error.constructor.name,
          document_id: doc.id
        });
      }
    }
  }
  
  // Final metrics
  const metrics = telemetry.getQueryMetrics();
  console.log(`
    Documents processed: ${documents.length}
    Total tokens: ${metrics.totalTokens}
    Average time: ${metrics.averageQueryTime}ms
    Error rate: ${metrics.errorRate}%
    Retry rate: ${metrics.retryRate}%
  `);
}

// Utility classes for the examples
class RealTimeUI {
  appendToken(token) { /* Update UI */ }
  updateProgress(metrics) { /* Show progress */ }
  isPauseRequested() { /* Check UI state */ }
  isCancelRequested() { /* Check UI state */ }
  waitForResume() { /* Return promise */ }
  showPartialResult(tokens) { /* Display partial */ }
}

class DocumentProcessorUI {
  updateDocumentProgress(id, progress) { /* Update UI */ }
  isDocumentCancelled(id) { /* Check state */ }
  markDocumentComplete(id) { /* Update UI */ }
  showRateLimitWarning(retryAfter) { /* Show warning */ }
  showError(id, message) { /* Show error */ }
  showWarning(id, message) { /* Show warning */ }
}

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getUserRole() {
  return process.env.USER_ROLE || 'user';
}

function splitIntoChunks(text, maxTokens) {
  // Implementation would split text into token-sized chunks
  return [];
}

async function processChunks(chunks) {
  // Process each chunk separately
  return [];
}

async function getDocumentsToProcess() {
  // Load documents from source
  return [];
}

async function splitDocument(doc, maxTokens) {
  // Split large document into smaller ones
  return [];
}

// Run demos
if (require.main === module) {
  console.log('🚀 Enhanced Features Preview\n');
  console.log('NOTE: This is a preview of upcoming features.');
  console.log('These APIs are not yet implemented.\n');
  
  // Show what the enhanced features would look like
  console.log('Features demonstrated:');
  console.log('1. Token-level streaming with pause/abort');
  console.log('2. Typed errors (RateLimitError, ToolPermissionError, etc.)');
  console.log('3. Per-call tool permission overrides');
  console.log('4. OpenTelemetry integration');
  console.log('5. Exponential backoff and retries');
  console.log('6. Circuit breaker pattern');
  console.log('7. Real-world document processing pipeline');
}