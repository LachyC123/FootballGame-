import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // docs/05 §2 hard rule: domain/ stays pure — no Phaser, DOM or storage imports.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'src/domain must not import Phaser.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/domain must not touch the DOM.' },
        { name: 'document', message: 'src/domain must not touch the DOM.' },
        { name: 'localStorage', message: 'src/domain must not touch storage.' },
        { name: 'indexedDB', message: 'src/domain must not touch storage.' },
      ],
    },
  },
);
