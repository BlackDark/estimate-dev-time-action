const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.js'],
  }
);