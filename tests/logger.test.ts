import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LogLevel,
  ConsoleLogger,
  JSONLogger,
  MultiLogger,
  NullLogger,
  type LogEntry
} from '../src/logger.js';

describe('Logger Implementations', () => {
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log
  };

  beforeEach(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.log = originalConsole.log;
  });

  describe('ConsoleLogger', () => {
    it('should log at appropriate levels', () => {
      const logger = new ConsoleLogger(LogLevel.TRACE);

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      logger.trace('Trace message');

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledTimes(2); // debug + trace
    });

    it('should respect minimum log level', () => {
      const logger = new ConsoleLogger(LogLevel.WARN);

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.info).toHaveBeenCalledTimes(0);
      expect(console.log).toHaveBeenCalledTimes(0);
    });

    it('should include prefix in log messages', () => {
      const logger = new ConsoleLogger(LogLevel.INFO, '[TEST]');

      logger.info('Test message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[TEST] INFO: Test message')
      );
    });

    it('should include context in logs', () => {
      const logger = new ConsoleLogger(LogLevel.INFO);

      logger.info('User action', { userId: 123, action: 'login' });

      expect(console.info).toHaveBeenCalledWith(
        expect.any(String),
        { userId: 123, action: 'login' }
      );
    });

    it('should extract error from context', () => {
      const logger = new ConsoleLogger(LogLevel.ERROR);
      const error = new Error('Test error');

      logger.error('Operation failed', { error, code: 'E001' });

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        { error, code: 'E001' },
        error
      );
    });

    it('should format timestamp correctly', () => {
      const logger = new ConsoleLogger(LogLevel.INFO);
      const beforeTime = new Date().toISOString();

      logger.info('Test');

      const afterTime = new Date().toISOString();
      const call = vi.mocked(console.info).mock.calls[0]?.[0] as string;
      
      // Extract timestamp from log message
      const timestampMatch = call.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      expect(timestampMatch).toBeTruthy();
      
      const timestamp = timestampMatch![1] as string;
      expect(timestamp >= beforeTime).toBe(true);
      expect(timestamp <= afterTime).toBe(true);
    });

    it('should handle direct log method', () => {
      const logger = new ConsoleLogger(LogLevel.DEBUG);
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Direct log',
        timestamp: new Date(),
        context: { test: true }
      };

      logger.log(entry);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Direct log'),
        { test: true }
      );
    });
  });

  describe('JSONLogger', () => {
    it('should output valid JSON', () => {
      const output = vi.fn();
      const logger = new JSONLogger(LogLevel.INFO, output);

      logger.info('Test message', { userId: 123 });

      expect(output).toHaveBeenCalledTimes(1);
      const json = JSON.parse(output.mock.calls[0][0]);
      
      expect(json).toMatchObject({
        level: 'INFO',
        message: 'Test message',
        userId: 123
      });
      expect(json.timestamp).toBeDefined();
    });

    it('should respect log level', () => {
      const output = vi.fn();
      const logger = new JSONLogger(LogLevel.WARN, output);

      logger.info('Should not appear');
      logger.warn('Should appear');

      expect(output).toHaveBeenCalledTimes(1);
    });

    it('should serialize errors properly', () => {
      const output = vi.fn();
      const logger = new JSONLogger(LogLevel.ERROR, output);
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.js:1:1';

      logger.error('Failed', { error });

      const json = JSON.parse(output.mock.calls[0][0]);
      expect(json.error).toEqual({
        message: 'Test error',
        name: 'Error',
        stack: error.stack
      });
    });

    it('should merge context into output', () => {
      const output = vi.fn();
      const logger = new JSONLogger(LogLevel.INFO, output);

      logger.info('Action', { user: 'alice', action: 'login', timestamp: 123 });

      const json = JSON.parse(output.mock.calls[0][0]);
      expect(json).toMatchObject({
        level: 'INFO',
        message: 'Action',
        user: 'alice',
        action: 'login',
        timestamp: 123  // Context values are merged in
      });
    });

    it('should use console.log by default', () => {
      const logger = new JSONLogger(LogLevel.INFO);

      logger.info('Test');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
    });
  });

  describe('MultiLogger', () => {
    it('should forward to all loggers', () => {
      const logger1 = new ConsoleLogger(LogLevel.INFO);
      const logger2 = new ConsoleLogger(LogLevel.INFO, '[L2]');
      const spy1 = vi.spyOn(logger1, 'info');
      const spy2 = vi.spyOn(logger2, 'info');

      const multi = new MultiLogger([logger1, logger2]);
      multi.info('Test message');

      expect(spy1).toHaveBeenCalledWith('Test message', undefined);
      expect(spy2).toHaveBeenCalledWith('Test message', undefined);
    });

    it('should forward all log levels', () => {
      const logger1 = new NullLogger();
      const logger2 = new NullLogger();
      const spies = {
        error1: vi.spyOn(logger1, 'error'),
        error2: vi.spyOn(logger2, 'error'),
        warn1: vi.spyOn(logger1, 'warn'),
        warn2: vi.spyOn(logger2, 'warn'),
        info1: vi.spyOn(logger1, 'info'),
        info2: vi.spyOn(logger2, 'info'),
        debug1: vi.spyOn(logger1, 'debug'),
        debug2: vi.spyOn(logger2, 'debug'),
        trace1: vi.spyOn(logger1, 'trace'),
        trace2: vi.spyOn(logger2, 'trace')
      };

      const multi = new MultiLogger([logger1, logger2]);
      
      multi.error('Error');
      multi.warn('Warn');
      multi.info('Info');
      multi.debug('Debug');
      multi.trace('Trace');

      Object.values(spies).forEach(spy => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });

    it('should forward log entries', () => {
      const logger1 = new NullLogger();
      const logger2 = new NullLogger();
      const spy1 = vi.spyOn(logger1, 'log');
      const spy2 = vi.spyOn(logger2, 'log');

      const multi = new MultiLogger([logger1, logger2]);
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test',
        timestamp: new Date()
      };

      multi.log(entry);

      expect(spy1).toHaveBeenCalledWith(entry);
      expect(spy2).toHaveBeenCalledWith(entry);
    });

    it('should handle empty logger array', () => {
      const multi = new MultiLogger([]);
      
      // Should not throw
      expect(() => {
        multi.info('Test');
      }).not.toThrow();
    });

    it('should continue if one logger throws', () => {
      const errorLogger = {
        log: vi.fn(() => { throw new Error('Logger failed'); }),
        error: vi.fn(() => { throw new Error('Logger failed'); }),
        warn: vi.fn(() => { throw new Error('Logger failed'); }),
        info: vi.fn(() => { throw new Error('Logger failed'); }),
        debug: vi.fn(() => { throw new Error('Logger failed'); }),
        trace: vi.fn(() => { throw new Error('Logger failed'); })
      };
      const workingLogger = new NullLogger();
      const spy = vi.spyOn(workingLogger, 'info');

      const multi = new MultiLogger([errorLogger, workingLogger]);
      
      // Should not throw and should call second logger
      expect(() => multi.info('Test')).not.toThrow();
      expect(spy).toHaveBeenCalledWith('Test', undefined);
    });
  });

  describe('NullLogger', () => {
    it('should not output anything', () => {
      const logger = new NullLogger();

      logger.error('Error');
      logger.warn('Warn');
      logger.info('Info');
      logger.debug('Debug');
      logger.trace('Trace');

      // Console methods should not be called
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle log entries', () => {
      const logger = new NullLogger();
      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Test',
        timestamp: new Date(),
        error: new Error('Test')
      };

      // Should not throw
      expect(() => logger.log(entry)).not.toThrow();
    });

    it('should handle context', () => {
      const logger = new NullLogger();

      // Should not throw
      expect(() => {
        logger.info('Test', { complex: { nested: 'object' } });
      }).not.toThrow();
    });
  });

  describe('LogLevel Enum', () => {
    it('should have correct ordering', () => {
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.DEBUG);
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.TRACE);
    });

    it('should have string representations', () => {
      expect(LogLevel[LogLevel.ERROR]).toBe('ERROR');
      expect(LogLevel[LogLevel.WARN]).toBe('WARN');
      expect(LogLevel[LogLevel.INFO]).toBe('INFO');
      expect(LogLevel[LogLevel.DEBUG]).toBe('DEBUG');
      expect(LogLevel[LogLevel.TRACE]).toBe('TRACE');
    });
  });

  describe('Logger Interface Compliance', () => {
    it('should ensure all loggers implement interface correctly', () => {
      const loggers = [
        new ConsoleLogger(),
        new JSONLogger(),
        new MultiLogger([]),
        new NullLogger()
      ];

      loggers.forEach(logger => {
        expect(typeof logger.log).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.debug).toBe('function');
        expect(typeof logger.trace).toBe('function');
      });
    });
  });
});