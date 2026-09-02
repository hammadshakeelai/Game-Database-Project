import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Unused args are fine when prefixed with _, which is how we mark
      // deliberately ignored callback parameters.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `any` defeats the point of the type system; the codebase does not use it.
      '@typescript-eslint/no-explicit-any': 'error',
      // console.error/warn are how the server reports real problems. Stray
      // console.log is debug noise and should not ship.
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'log'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // The server legitimately logs to stdout at startup.
    files: ['server/**/*.ts', 'scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
);
