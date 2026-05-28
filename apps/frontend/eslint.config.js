import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: ['dist', 'node_modules', 'mocks', '*.config.*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Prevent unnecessary default React import
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
                'Import icons from "@mui/icons-material" barrel export instead. Individual file imports break under Vite CJS interop.',
            },
          ],
        },
      ],

      // Prevent any type (warn to fix incrementally)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Enforce strict equality
      eqeqeq: ['error', 'always'],

      // Prevent console.log in production
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Import ordering (autofixable)
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // React
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
)
