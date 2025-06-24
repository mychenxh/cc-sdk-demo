// Base error class for all Claude SDK errors
export class ClaudeSDKError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ClaudeSDKError';
        Object.setPrototypeOf(this, ClaudeSDKError.prototype);
    }
}
// Error when CLI connection fails
export class CLIConnectionError extends ClaudeSDKError {
    constructor(message) {
        super(message);
        this.name = 'CLIConnectionError';
        Object.setPrototypeOf(this, CLIConnectionError.prototype);
    }
}
// Error when Claude Code CLI is not found
export class CLINotFoundError extends ClaudeSDKError {
    constructor(message = 'Claude Code CLI not found. Please install it from https://github.com/anthropics/claude-code') {
        super(message);
        this.name = 'CLINotFoundError';
        Object.setPrototypeOf(this, CLINotFoundError.prototype);
    }
}
// Error when CLI process fails
export class ProcessError extends ClaudeSDKError {
    exitCode;
    signal;
    constructor(message, exitCode, signal) {
        super(message);
        this.exitCode = exitCode;
        this.signal = signal;
        this.name = 'ProcessError';
        Object.setPrototypeOf(this, ProcessError.prototype);
    }
}
// Error when JSON parsing fails
export class CLIJSONDecodeError extends ClaudeSDKError {
    rawOutput;
    constructor(message, rawOutput) {
        super(message);
        this.rawOutput = rawOutput;
        this.name = 'CLIJSONDecodeError';
        Object.setPrototypeOf(this, CLIJSONDecodeError.prototype);
    }
}
// Error when configuration validation fails
export class ConfigValidationError extends ClaudeSDKError {
    constructor(message) {
        super(message);
        this.name = 'ConfigValidationError';
        Object.setPrototypeOf(this, ConfigValidationError.prototype);
    }
}
// Re-export enhanced error types
export * from './types/enhanced-errors.js';
