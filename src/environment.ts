/**
 * Safe environment variable loading for Claude Code SDK
 * 
 * IMPORTANT: This module intentionally does NOT load API keys from environment
 * variables to prevent accidental billing charges. API keys must be explicitly
 * provided by the user.
 */

import type { SafeEnvironmentOptions } from './types/environment.js';

/**
 * Parse boolean environment variable values
 */
function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  
  const normalized = value.toLowerCase().trim();
  
  // Handle common boolean representations
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  
  // Invalid boolean value
  return undefined;
}

/**
 * Parse and validate log level
 */
function parseLogLevel(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  
  const level = parseInt(value, 10);
  
  // Validate range (0-4)
  if (isNaN(level) || level < 0 || level > 4) {
    return undefined;
  }
  
  return level;
}

/**
 * Load safe environment variables
 * 
 * This function loads only non-sensitive environment variables that are safe
 * to use for configuration. It explicitly does NOT load API keys.
 * 
 * Supported environment variables:
 * - DEBUG: Enable debug mode (boolean)
 * - VERBOSE: Enable verbose output (boolean)
 * - LOG_LEVEL: Set log level 0-4 (number)
 * - NODE_ENV: Node environment (string)
 * 
 * @returns Options loaded from environment variables
 */
export function loadSafeEnvironmentOptions(): SafeEnvironmentOptions {
  const options: SafeEnvironmentOptions = {};
  
  // Load DEBUG
  const debug = parseBoolean(process.env.DEBUG);
  if (debug !== undefined) {
    options.debug = debug;
  }
  
  // Load VERBOSE
  const verbose = parseBoolean(process.env.VERBOSE);
  if (verbose !== undefined) {
    options.verbose = verbose;
  }
  
  // Load LOG_LEVEL
  const logLevel = parseLogLevel(process.env.LOG_LEVEL);
  if (logLevel !== undefined) {
    options.logLevel = logLevel;
  }
  
  // Load NODE_ENV
  if (process.env.NODE_ENV) {
    options.nodeEnv = process.env.NODE_ENV;
  }
  
  // IMPORTANT: We do NOT load ANTHROPIC_API_KEY here
  // This is a deliberate safety measure to prevent accidental billing
  
  return options;
}

/**
 * Warning message for API key safety
 */
export const API_KEY_SAFETY_WARNING = `
IMPORTANT: API keys are not automatically loaded from environment variables.
This is a safety measure to prevent accidental billing charges.

If you need to use an API key, you must explicitly provide it in your code:
  const result = await query('Your prompt', { apiKey: 'your-api-key' });

If you understand the risks and want to allow API key from environment:
  const result = await query('Your prompt', { 
    apiKey: process.env.ANTHROPIC_API_KEY,
    allowApiKeyFromEnv: true // Explicit opt-in
  });
`.trim();