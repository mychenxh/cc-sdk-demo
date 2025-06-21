// Base error class for all Claude SDK errors
export class ClaudeSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeSDKError';
    Object.setPrototypeOf(this, ClaudeSDKError.prototype);
  }
}

// Error when CLI connection fails
export class CLIConnectionError extends ClaudeSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'CLIConnectionError';
    Object.setPrototypeOf(this, CLIConnectionError.prototype);
  }
}

// Error when Claude Code CLI is not found
export class CLINotFoundError extends ClaudeSDKError {
  constructor(message: string = 'Claude Code CLI not found. Please install it from https://github.com/anthropics/claude-code') {
    super(message);
    this.name = 'CLINotFoundError';
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

// Error when CLI process fails
export class ProcessError extends ClaudeSDKError {
  constructor(
    message: string,
    public readonly exitCode?: number | null,
    public readonly signal?: NodeJS.Signals | null
  ) {
    super(message);
    this.name = 'ProcessError';
    Object.setPrototypeOf(this, ProcessError.prototype);
  }
}

// Error when JSON parsing fails
export class CLIJSONDecodeError extends ClaudeSDKError {
  constructor(
    message: string,
    public readonly rawOutput: string
  ) {
    super(message);
    this.name = 'CLIJSONDecodeError';
    Object.setPrototypeOf(this, CLIJSONDecodeError.prototype);
  }
}