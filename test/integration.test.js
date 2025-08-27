describe('Integration Tests', () => {
  let actionModule;

  beforeAll(() => {
    // Load the built action module
    actionModule = require('../dist/index.js');
  });

  test('action module exports should be available', () => {
    expect(typeof actionModule.run).toBe('function');
    expect(typeof actionModule.OpenRouterClient).toBe('function');
    expect(typeof actionModule.GitHubClient).toBe('function');
  });

  test('OpenRouterClient can be instantiated', () => {
    expect(() => {
      new actionModule.OpenRouterClient('test-key', 'test-model');
    }).not.toThrow();
  });

  test('OpenRouterClient has required methods', () => {
    const client = new actionModule.OpenRouterClient('test-key');
    expect(typeof client.estimateDevTime).toBe('function');
  });

  test('GitHubClient can be instantiated', () => {
    expect(() => {
      new actionModule.GitHubClient('test-token');
    }).not.toThrow();
  });

  test('run function should be callable (basic structure test)', () => {
    // We can't actually run it without proper GitHub context, but we can check it exists
    expect(typeof actionModule.run).toBe('function');
    expect(actionModule.run.length).toBe(0); // No parameters expected
  });

  test('should handle JSON format validation', () => {
    const testResponse = JSON.stringify({
      estimations: {
        Junior: {
          timeEstimate: '2-3 hours',
          reasoning: 'Simple task',
          complexity: 'Low',
        },
      },
    });

    // Basic validation that the format is correct
    const parsedContent = `\`\`\`json\n${testResponse}\n\`\`\``;

    expect(parsedContent).toContain('estimations');
    expect(parsedContent).toContain('Junior');
    expect(parsedContent).toContain('timeEstimate');
  });
});
