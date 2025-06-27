/**
 * Enhanced error classes with categories and resolution hints
 */

import type { 
  ErrorCategory, 
  EnhancedErrorOptions, 
  IEnhancedError 
} from '../types/environment.js';

/**
 * Enhanced base error class with category and resolution
 */
export class EnhancedBaseError extends Error implements IEnhancedError {
  category: ErrorCategory;
  resolution?: string;
  statusCode?: number;
  cause?: Error;
  context?: Record<string, unknown>;
  
  constructor(message: string, options: EnhancedErrorOptions) {
    super(message);
    this.name = 'EnhancedBaseError';
    this.category = options.category;
    this.resolution = options.resolution;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
    this.context = options.context;
    
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, EnhancedBaseError.prototype);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Serialize error to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      resolution: this.resolution,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
  }
}

/**
 * Authentication error
 */
export class EnhancedAuthenticationError extends EnhancedBaseError {
  constructor(message: string, resolution?: string) {
    super(message, {
      category: 'auth',
      resolution: resolution || 'Please check your API key or run "claude login" to authenticate',
      statusCode: 401
    });
    this.name = 'EnhancedAuthenticationError';
    Object.setPrototypeOf(this, EnhancedAuthenticationError.prototype);
  }
}

/**
 * Network error
 */
export class EnhancedNetworkError extends EnhancedBaseError {
  constructor(message: string, resolution?: string) {
    super(message, {
      category: 'network',
      resolution: resolution || 'Please check your internet connection and try again',
      statusCode: undefined
    });
    this.name = 'EnhancedNetworkError';
    Object.setPrototypeOf(this, EnhancedNetworkError.prototype);
  }
}

/**
 * Timeout error
 */
export class EnhancedTimeoutError extends EnhancedBaseError {
  constructor(message: string, timeoutMs?: number, resolution?: string) {
    super(message, {
      category: 'timeout',
      resolution: resolution || 'The operation took too long. Try again with a shorter prompt or increase the timeout',
      context: timeoutMs ? { timeoutMs } : undefined
    });
    this.name = 'EnhancedTimeoutError';
    Object.setPrototypeOf(this, EnhancedTimeoutError.prototype);
  }
}

/**
 * Validation error
 */
export class EnhancedValidationError extends EnhancedBaseError {
  constructor(
    message: string, 
    context?: {
      field?: string;
      value?: unknown;
      validValues?: unknown[];
    }
  ) {
    super(message, {
      category: 'validation',
      resolution: 'Please check your input and try again',
      statusCode: 400,
      context
    });
    this.name = 'EnhancedValidationError';
    Object.setPrototypeOf(this, EnhancedValidationError.prototype);
  }
}

/**
 * Subprocess error
 */
export class EnhancedSubprocessError extends EnhancedBaseError {
  constructor(
    message: string,
    context?: {
      exitCode?: number | null;
      signal?: string | null;
      command?: string;
    }
  ) {
    const exitCode = context?.exitCode;
    let resolution = 'Please check the CLI installation and try again';
    
    if (exitCode === 127) {
      resolution = 'Command not found. Please ensure Claude CLI is installed and in your PATH';
    } else if (exitCode === 1) {
      resolution = 'Command failed. Check the error message for details';
    }
    
    super(message, {
      category: 'subprocess',
      resolution,
      context
    });
    this.name = 'EnhancedSubprocessError';
    Object.setPrototypeOf(this, EnhancedSubprocessError.prototype);
  }
}

/**
 * Parsing error
 */
export class EnhancedParsingError extends EnhancedBaseError {
  constructor(
    message: string,
    context?: {
      rawOutput?: string;
      parseError?: string;
    }
  ) {
    super(message, {
      category: 'parsing',
      resolution: 'The response format was unexpected. This may be a temporary issue',
      context
    });
    this.name = 'EnhancedParsingError';
    Object.setPrototypeOf(this, EnhancedParsingError.prototype);
  }
}

/**
 * Permission error
 */
export class EnhancedPermissionError extends EnhancedBaseError {
  constructor(message: string, resource?: string) {
    super(message, {
      category: 'permission',
      resolution: 'Please check your permissions and try again',
      statusCode: 403,
      context: resource ? { resource } : undefined
    });
    this.name = 'EnhancedPermissionError';
    Object.setPrototypeOf(this, EnhancedPermissionError.prototype);
  }
}

/**
 * Configuration error (added based on feedback)
 */
export class EnhancedConfigurationError extends EnhancedBaseError {
  constructor(message: string, field?: string) {
    super(message, {
      category: 'configuration',
      resolution: 'Please check your SDK configuration and initialization',
      context: field ? { field } : undefined
    });
    this.name = 'EnhancedConfigurationError';
    Object.setPrototypeOf(this, EnhancedConfigurationError.prototype);
  }
}

/**
 * Error mapping patterns
 */
const ERROR_PATTERNS: Map<RegExp, ErrorCategory> = new Map([
  // Authentication patterns
  [/authentication|unauthorized|invalid api key|401/i, 'auth'],
  
  // Timeout patterns (more specific, check first)
  [/timeout|timed out|operation timeout|ETIMEDOUT.*timeout/i, 'timeout'],
  
  // Network patterns
  [/network|connection|econnrefused|etimedout|dns/i, 'network'],
  
  // Validation patterns
  [/validation|invalid (input|format|model|parameter)/i, 'validation'],
  
  // Subprocess patterns
  [/command failed|exit code|signal|spawn|enoent|cli not found/i, 'subprocess'],
  
  // Parsing patterns
  [/parse|parsing|json|unexpected token|invalid response/i, 'parsing'],
  
  // Permission patterns
  [/permission|forbidden|access denied|403/i, 'permission'],
  
  // Configuration patterns
  [/configuration|config|initialization|setup/i, 'configuration']
]);

/**
 * Map error message to category
 */
export function mapErrorToCategory(message: string): ErrorCategory {
  for (const [pattern, category] of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return category;
    }
  }
  return 'unknown';
}

/**
 * Get default resolution for a category
 */
export function getDefaultResolution(category: ErrorCategory): string {
  const resolutions: Record<ErrorCategory, string> = {
    auth: 'Please check your API key or run "claude login" to authenticate',
    network: 'Please check your internet connection and try again',
    timeout: 'The operation took too long. Try again with a shorter prompt or increase the timeout',
    validation: 'Please check your input parameters and try again',
    subprocess: 'Please check the CLI installation and try again',
    parsing: 'The response format was unexpected. This may be a temporary issue',
    permission: 'Please check your permissions and try again',
    configuration: 'Please check your SDK configuration and initialization',
    unknown: 'An unexpected error occurred. Please try again or report this issue'
  };
  
  return resolutions[category];
}

/**
 * Create error from category
 */
export function createErrorFromCategory(
  category: ErrorCategory,
  message: string,
  context?: Record<string, unknown>
): EnhancedBaseError {
  switch (category) {
    case 'auth':
      return new EnhancedAuthenticationError(message);
      
    case 'network':
      return new EnhancedNetworkError(message);
      
    case 'timeout':
      return new EnhancedTimeoutError(
        message, 
        context?.timeoutMs as number | undefined
      );
      
    case 'validation':
      return new EnhancedValidationError(message, context);
      
    case 'subprocess':
      return new EnhancedSubprocessError(message, context);
      
    case 'parsing':
      return new EnhancedParsingError(message, context);
      
    case 'permission':
      return new EnhancedPermissionError(
        message,
        context?.resource as string | undefined
      );
      
    case 'configuration':
      return new EnhancedConfigurationError(
        message,
        context?.field as string | undefined
      );
      
    default:
      return new EnhancedBaseError(message, {
        category: 'unknown',
        resolution: getDefaultResolution('unknown'),
        context
      });
  }
}

/**
 * Create enhanced error from message
 */
export function createErrorFromMessage(
  message: string,
  context?: Record<string, unknown>
): EnhancedBaseError {
  const category = mapErrorToCategory(message);
  return createErrorFromCategory(category, message, context);
}

/**
 * Enhance an existing error
 */
export function enhanceExistingError(error: Error): EnhancedBaseError {
  const category = mapErrorToCategory(error.message);
  const enhanced = createErrorFromCategory(category, error.message);
  enhanced.cause = error;
  enhanced.stack = error.stack;
  return enhanced;
}