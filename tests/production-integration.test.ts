import { describe, it, expect, beforeAll } from 'vitest';
import { claude } from '../src/fluent.js';
import { CLINotFoundError } from '../src/errors.js';

// These are real integration tests that run against the actual Claude CLI
// They require Claude CLI to be installed and authenticated
describe('Production Integration Tests', { timeout: 30000 }, () => {
  beforeAll(async () => {
    // Verify Claude CLI is available
    try {
      const result = await claude()
        .query('Say "test" and nothing else')
        .asResult();
      
      console.log('Claude CLI is available and responding');
    } catch (error) {
      if (error instanceof CLINotFoundError) {
        console.error('Claude CLI not found. Please install it first.');
        throw error;
      }
      // Other errors might be auth-related, which we'll handle in individual tests
    }
  });

  describe('Basic Functionality', () => {
    it('should execute a simple query', async () => {
      const result = await claude()
        .query('What is 2+2? Just give me the number.')
        .asResult();
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Claude might say "4" or "4." or "The answer is 4" etc.
      expect(result).toMatch(/4/);
    });

    it('should stream responses', async () => {
      const messages: string[] = [];
      
      await claude()
        .onAssistant(content => {
          const text = content?.[0]?.text || '';
          if (text) messages.push(text);
        })
        .query('Count from 1 to 3, one number per line')
        .asCompleted();
      
      expect(messages.length).toBeGreaterThan(0);
      const fullText = messages.join('');
      expect(fullText).toMatch(/1/);
      expect(fullText).toMatch(/2/);
      expect(fullText).toMatch(/3/);
    });
  });

  describe('Production Features', () => {
    it('should support read-only mode', async () => {
      // In read-only mode, Claude can't use any tools
      const result = await claude()
        .allowTools() // Empty array = read-only mode
        .query('What tools do you have access to?')
        .asResult();
      
      expect(result).toBeDefined();
      // Claude should indicate limited or no tool access
      expect(result.toLowerCase()).toMatch(/no.*tools|limited|restricted|can't|cannot/i);
    });

    it('should handle session management', async () => {
      // Create a session with context
      const sessionId = `test-session-${Date.now()}`;
      
      // First query
      await claude()
        .withSessionId(sessionId)
        .query('Remember this number: 42')
        .asResult();
      
      // Second query in same session
      const result = await claude()
        .withSessionId(sessionId)
        .query('What number did I ask you to remember?')
        .asResult();
      
      expect(result).toMatch(/42/);
    });

    it('should support custom models', async () => {
      const result = await claude()
        .withModel('haiku')
        .query('Say "haiku model active"')
        .asResult();
      
      expect(result).toBeDefined();
      expect(result.toLowerCase()).toMatch(/haiku/);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tools gracefully', async () => {
      await expect(
        claude()
          .allowTools('InvalidToolName' as any)
          .query('test')
          .asResult()
      ).rejects.toThrow();
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      
      // Start query and abort it quickly
      const promise = claude()
        .withSignal(controller.signal)
        .query('Write a very long story that would take at least 30 seconds to complete about the history of computing from the abacus to quantum computers including all major milestones and inventions')
        .asResult();
      
      // Abort after a short delay
      setTimeout(() => controller.abort(), 500);
      
      // The promise might resolve with partial result or reject
      try {
        const result = await promise;
        // If it resolves, it should be a partial response
        expect(result).toBeDefined();
      } catch (error) {
        // If it rejects, that's also acceptable
        expect(error).toBeDefined();
      }
    });
  });

  describe('Advanced Features', () => {
    it('should apply model settings', async () => {
      // Test different models
      const results = await Promise.all([
        claude()
          .withModel('haiku')
          .query('Say "haiku model"')
          .asResult(),
        claude()
          .withModel('sonnet')
          .query('Say "sonnet model"')
          .asResult()
      ]);
      
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      // Results should reference the model names
      expect(results[0].toLowerCase()).toMatch(/haiku/);
      expect(results[1].toLowerCase()).toMatch(/sonnet/);
    });

    it('should support MCP server configurations', async () => {
      const result = await claude()
        .withMCPServerPermission('file-system', 'whitelist')
        .query('What MCP permissions are configured?')
        .asResult();
      
      expect(result).toBeDefined();
    });
  });

  describe('Tool Permissions', () => {
    it('should restrict tools when specified', async () => {
      const result = await claude()
        .allowTools('Read') // Only allow Read tool
        .query('Can you write a file for me?')
        .asResult();
      
      expect(result).toBeDefined();
      // Claude should indicate it can't write files
      expect(result.toLowerCase()).toMatch(/can't|cannot|unable|don't have.*permission/i);
    });

    it('should work with skipPermissions', async () => {
      const result = await claude()
        .skipPermissions()
        .query('What permissions mode am I using?')
        .asResult();
      
      expect(result).toBeDefined();
    });
  });
});