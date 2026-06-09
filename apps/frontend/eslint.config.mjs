import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

import baseConfig from '../../eslint.config.mjs'

export default tseslint.config(
  ...baseConfig,
  {
    ignores: ['dist', 'node_modules', 'mocks', '*.config.*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['default'],
              message:
                'Default React import is unnecessary with jsx: react-jsx. Use named imports instead.',
            },
          ],
          patterns: [
            {
              group: ['@mui/icons-material/*'],
              message:
                'Import icons from "@mui/icons-material" barrel export instead.',
            },
          ],
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  }
)
