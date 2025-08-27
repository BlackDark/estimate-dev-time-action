const { spawn } = require('child_process');
const path = require('path');

describe('Runtime Tests', () => {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.js');

  test('bundle should execute without immediate errors', (done) => {
    // Test that the bundle can be loaded and executed by Node.js
    const child = spawn(
      'node',
      [
        '-e',
        `
      try {
        const action = require('${indexPath}');
        console.log('SUCCESS: Bundle loaded successfully');
        console.log('Exports:', Object.keys(action));
        process.exit(0);
      } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
      }
    `,
      ],
      { stdio: 'pipe' }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('STDOUT:', stdout);
        console.error('STDERR:', stderr);
        done(new Error(`Process failed with code ${code}`));
      } else {
        expect(stdout).toContain('SUCCESS: Bundle loaded successfully');
        expect(stdout).toContain('run');
        done();
      }
    });
  }, 10000); // 10 second timeout

  test('should not have obvious syntax errors', () => {
    // Basic syntax check by loading the file
    expect(() => {
      require(indexPath);
    }).not.toThrow();
  });
});
