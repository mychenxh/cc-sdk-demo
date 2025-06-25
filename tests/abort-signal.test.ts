import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { query } from '../src/index.js';
import { AbortError } from '../src/errors.js';
import { Readable, PassThrough } from 'node:stream';

// Mock execa
vi.mock('execa');
vi.mock('which', () => ({
  default: vi.fn().mockResolvedValue('/usr/local/bin/claude')
}));

// Helper to create a mock subprocess
function createMockProcess() {
  const mockStdin = new PassThrough();
  const mockStdout = new PassThrough();
  const mockStderr = new PassThrough();
  
  const mockProcess = {
    stdin: mockStdin,
    stdout: mockStdout,
    stderr: mockStderr,
    kill: vi.fn(),
    killed: false,
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn().mockReturnThis(),
    removeAllListeners: vi.fn().mockReturnThis(),
    cancel: vi.fn(() => {
      mockProcess.killed = true;
      // Simulate CancelError
      const error = new Error('canceled');
      error.name = 'CancelError';
      (error as any).isCanceled = true;
      throw error;
    }),
    // Promise-like behavior
    then: undefined,
    catch: undefined,
    finally: undefined
  };
  
  return { mockProcess, mockStdin, mockStdout, mockStderr };
}

// Helper to consume async generator and collect messages
async function collectMessages(stream: AsyncGenerator<any>) {
  const messages = [];
  for await (const msg of stream) {
    messages.push(msg);
  }
  return messages;
}

describe('AbortSignal Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should abort cleanly when signal is triggered during streaming', async () => {
    const { mockProcess, mockStdout, mockStderr } = createMockProcess();
    
    // Mock execa to return our mock process
    const { execa } = await import('execa');
    vi.mocked(execa).mockReturnValue(mockProcess as any);
    
    // Create abort controller
    const abortController = new AbortController();
    
    // Start writing mock data after a delay
    setTimeout(() => {
      mockStdout.write(JSON.stringify({ type: 'assistant', message: 'Starting response...' }) + '\n');
    }, 50);
    
    setTimeout(() => {
      mockStdout.write(JSON.stringify({ type: 'assistant', message: 'This is a long response...' }) + '\n');
    }, 150);
    
    // Set up process promise behavior
    let processReject: any;
    const processPromise = new Promise((_, reject) => {
      processReject = reject;
    });
    
    // Add promise methods to mock process
    mockProcess.then = processPromise.then.bind(processPromise);
    mockProcess.catch = processPromise.catch.bind(processPromise);
    mockProcess.finally = processPromise.finally.bind(processPromise);
    
    // When abort happens, reject the process promise
    abortController.signal.addEventListener('abort', () => {
      const error = new Error('canceled');
      error.name = 'CancelError';
      (error as any).isCanceled = true;
      processReject(error);
    });
    
    // Start query
    const stream = query('Test prompt', {
      signal: abortController.signal
    });
    
    // Collect messages in background
    const collectionPromise = collectMessages(stream);
    
    // Abort after first message
    setTimeout(() => {
      abortController.abort();
    }, 100);
    
    // Should throw AbortError
    await expect(collectionPromise).rejects.toThrow(AbortError);
    await expect(collectionPromise).rejects.toThrow('Query was aborted via AbortSignal');
    
    // Verify process was cancelled
    expect(mockProcess.cancel).toHaveBeenCalled();
  });

  it('should handle pre-aborted signal gracefully', async () => {
    const { mockProcess } = createMockProcess();
    
    const { execa } = await import('execa');
    vi.mocked(execa).mockReturnValue(mockProcess as any);
    
    // Create pre-aborted signal
    const abortController = new AbortController();
    abortController.abort();
    
    // Should throw immediately when trying to iterate
    const stream = query('Test prompt', {
      signal: abortController.signal
    });
    
    // Collecting messages should throw AbortError
    await expect(collectMessages(stream)).rejects.toThrow(AbortError);
  });

  it('should clean up event listeners on abort', async () => {
    const { mockProcess, mockStdout, mockStderr } = createMockProcess();
    
    const { execa } = await import('execa');
    vi.mocked(execa).mockReturnValue(mockProcess as any);
    
    // Track event listener additions/removals
    const listeners = new Map();
    const originalOn = mockProcess.on;
    mockProcess.on = vi.fn((event, handler) => {
      listeners.set(event, handler);
      return originalOn.call(mockProcess, event, handler);
    });
    mockProcess.removeListener = vi.fn((event) => {
      listeners.delete(event);
      return mockProcess;
    });
    
    const abortController = new AbortController();
    
    // Send initial data
    setTimeout(() => {
      mockStdout.write(JSON.stringify({ type: 'assistant', message: 'Test' }) + '\n');
    }, 50);
    
    // Set up process promise behavior
    let processReject: any;
    const processPromise = new Promise((_, reject) => {
      processReject = reject;
    });
    
    mockProcess.then = processPromise.then.bind(processPromise);
    mockProcess.catch = processPromise.catch.bind(processPromise);
    mockProcess.finally = processPromise.finally.bind(processPromise);
    
    // When abort happens, reject the process promise
    abortController.signal.addEventListener('abort', () => {
      const error = new Error('canceled');
      error.name = 'CancelError';
      (error as any).isCanceled = true;
      processReject(error);
    });
    
    const stream = query('Test prompt', {
      signal: abortController.signal
    });
    
    // Start collecting
    const collectionPromise = collectMessages(stream);
    
    // Let it start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check error listener was added
    expect(listeners.has('error')).toBe(true);
    
    // Abort
    abortController.abort();
    
    await expect(collectionPromise).rejects.toThrow(AbortError);
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Error listener should be cleaned up
    expect(mockProcess.removeListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should not interfere with normal completion', async () => {
    const { mockProcess, mockStdout, mockStderr } = createMockProcess();
    
    const { execa } = await import('execa');
    vi.mocked(execa).mockReturnValue(mockProcess as any);
    
    // Send complete response
    setTimeout(() => {
      mockStdout.write(JSON.stringify({ type: 'assistant', message: 'Complete response' }) + '\n');
      mockStdout.write(JSON.stringify({ type: 'completion', stop_reason: 'end_turn' }) + '\n');
      mockStdout.end();
    }, 50);
    
    // Mock successful process completion
    const processPromise = Promise.resolve();
    mockProcess.then = processPromise.then.bind(processPromise);
    mockProcess.catch = processPromise.catch.bind(processPromise);
    mockProcess.finally = processPromise.finally.bind(processPromise);
    
    // Query with abort signal that we won't trigger
    const abortController = new AbortController();
    
    const stream = query('Test prompt', {
      signal: abortController.signal
    });
    
    // Collect all messages
    const messages = await collectMessages(stream);
    
    // Should complete normally
    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('assistant');
    expect(messages[0].message).toBe('Complete response');
    expect(messages[1].type).toBe('completion');
    
    // Process should not be killed
    expect(mockProcess.cancel).not.toHaveBeenCalled();
  });

  it('should handle abort during spawn gracefully', async () => {
    const { mockProcess, mockStdout, mockStderr } = createMockProcess();
    
    const { execa } = await import('execa');
    
    // Create pre-aborted signal
    const abortController = new AbortController();
    
    // Delay execa to simulate spawn time
    vi.mocked(execa).mockImplementation(async () => {
      // Check if already aborted
      if (abortController.signal.aborted) {
        throw new Error('spawn aborted');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      return mockProcess as any;
    });
    
    const stream = query('Test prompt', {
      signal: abortController.signal
    });
    
    const collectionPromise = collectMessages(stream);
    
    // Abort immediately (before spawn completes)
    setTimeout(() => {
      abortController.abort();
    }, 50);
    
    // Should throw AbortError
    await expect(collectionPromise).rejects.toThrow(AbortError);
  });

  it('should use timeout fallback for unresponsive process', async () => {
    const { mockProcess, mockStdout, mockStderr } = createMockProcess();
    
    const { execa } = await import('execa');
    vi.mocked(execa).mockReturnValue(mockProcess as any);
    
    // Mock a process that doesn't respond to cancel
    mockProcess.cancel = vi.fn(() => {
      // Don't set killed = true
      // Don't throw error, simulating unresponsive process
    });
    
    const abortController = new AbortController();
    
    // Send initial data
    setTimeout(() => {
      mockStdout.write(JSON.stringify({ type: 'assistant', message: 'Test' }) + '\n');
    }, 50);
    
    // Set up process that never completes
    const processPromise = new Promise(() => {}); // Never resolves
    mockProcess.then = processPromise.then.bind(processPromise);
    mockProcess.catch = processPromise.catch.bind(processPromise);
    mockProcess.finally = processPromise.finally.bind(processPromise);
    
    // Use fake timers for timeout testing
    vi.useFakeTimers();
    
    const stream = query('Test prompt', {
      signal: abortController.signal
    });
    
    const collectionPromise = collectMessages(stream);
    
    // Let it start
    await vi.advanceTimersByTimeAsync(100);
    
    // Abort
    abortController.abort();
    
    // Should try cancel first
    expect(mockProcess.cancel).toHaveBeenCalled();
    
    // Advance time to trigger SIGKILL timeout
    await vi.advanceTimersByTimeAsync(5000);
    
    // Should try SIGKILL
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    
    vi.useRealTimers();
  });
});