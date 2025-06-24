/**
 * Base error class to avoid circular dependencies
 */

export class BaseSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaseSDKError';
    Object.setPrototypeOf(this, BaseSDKError.prototype);
  }
}