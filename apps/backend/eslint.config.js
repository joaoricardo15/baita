import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint.config.js'

export default tseslint.config(
  ...baseConfig,
  {
    ignores: ['node_modules', '.build', '.serverless', 'coverage', '*.config.*'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  }
)
