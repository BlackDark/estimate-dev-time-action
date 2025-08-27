const { filterDiffByPatterns, parseIgnorePatterns } = require('../dist/index.js');

describe('Diff Filtering', () => {
  test('parseIgnorePatterns should parse comma-separated patterns', () => {
    const patterns = parseIgnorePatterns('dist/**,build/**,*.min.js');
    expect(patterns).toEqual(['dist/**', 'build/**', '*.min.js']);
  });

  test('parseIgnorePatterns should handle empty input', () => {
    expect(parseIgnorePatterns('')).toEqual([]);
    expect(parseIgnorePatterns(' ')).toEqual([]);
    expect(parseIgnorePatterns(null)).toEqual([]);
    expect(parseIgnorePatterns(undefined)).toEqual([]);
  });

  test('filterDiffByPatterns should filter out dist files', () => {
    const mockDiff = `diff --git a/src/main.ts b/src/main.ts
index 1234567..abcdefg 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,4 @@
 export function main() {
+  console.log('hello');
   return 'world';
 }
diff --git a/dist/main.js b/dist/main.js
index 1234567..abcdefg 100644
--- a/dist/main.js
+++ b/dist/main.js
@@ -1,10 +1,20 @@
+// Generated file
+function main() {
+  console.log('hello');
+  return 'world';
+}`;

    const { filteredDiff, filteredStats } = filterDiffByPatterns(mockDiff, ['dist/**']);
    
    expect(filteredDiff).toContain('src/main.ts');
    expect(filteredDiff).not.toContain('dist/main.js');
    expect(filteredStats.changedFiles).toBe(1);
  });

  test('filterDiffByPatterns should return original if no patterns', () => {
    const mockDiff = `diff --git a/src/main.ts b/src/main.ts
--- a/src/main.ts
+++ b/src/main.ts
+console.log('test');`;

    const { filteredDiff, filteredStats } = filterDiffByPatterns(mockDiff, []);
    
    expect(filteredDiff).toBe(mockDiff);
    expect(filteredStats.additions).toBe(1); // Now calculates stats even with no patterns
    expect(filteredStats.changedFiles).toBe(1);
  });

  test('should handle glob patterns correctly', () => {
    const testCases = [
      { file: 'dist/main.js', pattern: 'dist/**', shouldMatch: true },
      { file: 'build/output.js', pattern: 'build/**', shouldMatch: true },
      { file: 'src/main.ts', pattern: 'dist/**', shouldMatch: false },
      { file: 'test.min.js', pattern: '*.min.js', shouldMatch: true },
      { file: 'src/test.min.js', pattern: '*.min.js', shouldMatch: false },
      { file: 'package-lock.json', pattern: 'package-lock.json', shouldMatch: true },
    ];

    // We can't easily test the internal shouldIgnoreFile function,
    // but we can test the behavior through filterDiffByPatterns
    testCases.forEach(({ file, pattern, shouldMatch }) => {
      const mockDiff = `diff --git a/${file} b/${file}\n+test line`;
      const { filteredDiff } = filterDiffByPatterns(mockDiff, [pattern]);
      
      if (shouldMatch) {
        expect(filteredDiff).not.toContain(file);
      } else {
        expect(filteredDiff).toContain(file);
      }
    });
  });

  test('filterDiffByPatterns should categorize file types correctly', () => {
    const mockDiff = `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 1234567..abcdefg 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1,3 +1,4 @@
+import React from 'react';
 export const Button = () => {
   return <button>Click me</button>;
 };
diff --git a/package.json b/package.json
index 2345678..bcdefgh 100644
--- a/package.json
+++ b/package.json
@@ -1,3 +1,4 @@
+  "version": "1.0.1",
   "name": "test-package",
   "dependencies": {}
 }
diff --git a/src/components/Button.test.tsx b/src/components/Button.test.tsx
index 3456789..cdefghi 100644
--- a/src/components/Button.test.tsx
+++ b/src/components/Button.test.tsx
@@ -1,3 +1,4 @@
+import { render } from '@testing-library/react';
 import { Button } from './Button';

 test('renders button', () => {
diff --git a/README.md b/README.md
index 4567890..defghij 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
+# Updated Project
 # Test Project

 This is a test.`;
    
    const result = filterDiffByPatterns(mockDiff, []);
    
    
    expect(result.fileTypeAnalysis.codeFiles).toContain('src/components/Button.tsx');
    expect(result.fileTypeAnalysis.configFiles).toContain('package.json');
    expect(result.fileTypeAnalysis.testFiles).toContain('src/components/Button.test.tsx');
    expect(result.fileTypeAnalysis.documentationFiles).toContain('README.md');
  });
});