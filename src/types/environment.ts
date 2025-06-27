/**
 * Environment and error utility types
 */

export interface SafeEnvironmentOptions {
  debug?: boolean;
  verbose?: boolean;
  logLevel?: number;
  nodeEnv?: string;
}

export type ErrorCategory = 
  | 'auth' 
  | 'network' 
  | 'timeout' 
  | 'validation' 
  | 'subprocess' 
  | 'parsing' 
  | 'permission' 
  | 'configuration' 
  | 'unknown';

export interface EnhancedErrorOptions {
  category?: ErrorCategory;
  context?: Record<string, unknown>;
  retryable?: boolean;
  resolution?: string;
  helpUrl?: string;
}

/**
 * Type guard to check if an error is an enhanced error
 */
export function isEnhancedError(error: unknown): error is Error & EnhancedErrorOptions {
  return error instanceof Error && 
    'category' in error && 
    typeof (error as any).category === 'string';
}

/**
 * Check if an error has resolution information
 */
export function hasResolution(error: unknown): boolean {
  return isEnhancedError(error) && 
    !!error.resolution && 
    typeof error.resolution === 'string';
}