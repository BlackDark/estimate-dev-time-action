const fs = require('fs');
const path = require('path');

describe('Build Verification', () => {
  const distPath = path.join(__dirname, '..', 'dist');
  const indexPath = path.join(distPath, 'index.js');

  test('dist/index.js should exist', () => {
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  test('dist/index.js should be a valid CommonJS module', () => {
    expect(() => {
      require(indexPath);
    }).not.toThrow();
  });

  test('should export run function', () => {
    const action = require(indexPath);
    expect(typeof action.run).toBe('function');
  });

  test('OpenRouterClient should be importable', () => {
    // Test that we can require the built file without runtime errors
    const content = fs.readFileSync(indexPath, 'utf8');
    expect(content).toContain('OpenRouterClient');
    expect(content).toContain('GitHubClient');
    expect(content).toContain('formatEstimationComment');
  });

  test('bundle should be reasonable size (less than 2MB)', () => {
    const stats = fs.statSync(indexPath);
    const sizeInMB = stats.size / (1024 * 1024);
    expect(sizeInMB).toBeLessThan(2);
    console.log(`Bundle size: ${sizeInMB.toFixed(2)}MB`);
  });

  test('should contain required dependencies', () => {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check that essential dependencies are bundled (after minification, names may be transformed)
    expect(content).toContain('chat/completions'); // OpenAI SDK endpoint
    expect(content.includes('getInput') || content.includes('setOutput')).toBe(true); // GitHub Actions core
    expect(content.includes('getPrChanges') || content.includes('updateOrCreateComment')).toBe(true); // Our GitHub functionality
  });
});