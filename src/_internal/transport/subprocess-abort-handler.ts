import { type ExecaChildProcess } from 'execa';
import { AbortError } from '../../errors.js';

/**
 * Manages proper subprocess cleanup when AbortSignal is triggered.
 * Addresses the Node.js console warning issue and ensures clean termination.
 */
export class SubprocessAbortHandler {
  private cleanupHandler?: () => void;
  private timeoutId?: NodeJS.Timeout;

  constructor(
    private process: ExecaChildProcess,
    private signal?: AbortSignal
  ) {}

  /**
   * Sets up abort handling with proper cleanup.
   * Returns a cleanup function that should be called in finally blocks.
   */
  setup(): () => void {
    if (!this.signal) {
      return () => {};
    }

    // Check if already aborted
    if (this.signal.aborted) {
      this.process.cancel();
      throw new AbortError('Operation aborted before starting');
    }

    // Create abort handler
    this.cleanupHandler = () => {
      // Use execa's cancel method for clean termination
      this.process.cancel();
      
      // Set a fallback timeout for forceful termination
      this.timeoutId = setTimeout(() => {
        if (!this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    };

    // Attach abort listener
    this.signal.addEventListener('abort', this.cleanupHandler, { once: true });

    // Handle process errors to prevent unhandled rejection warnings
    const errorHandler = (error: Error) => {
      // Only suppress abort-related errors
      if (error.name === 'CancelError' || this.signal?.aborted) {
        // This is expected when aborting, not a real error
        return;
      }
      // Re-throw other errors
      throw error;
    };
    this.process.on('error', errorHandler);

    // Return cleanup function
    return () => {
      if (this.cleanupHandler) {
        this.signal?.removeEventListener('abort', this.cleanupHandler);
      }
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      this.process.removeListener('error', errorHandler);
    };
  }

  /**
   * Checks if the process was aborted
   */
  wasAborted(): boolean {
    return this.signal?.aborted ?? false;
  }
}