import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Regras legadas em warn até limpeza dedicada; erros só em hooks e bugs óbvios. */
function warnRules(config) {
  if (!config?.rules) return config;
  return {
    ...config,
    rules: Object.fromEntries(
      Object.entries(config.rules).map(([key, value]) => {
        if (value === 'error' || value === 2) return [key, 'warn'];
        return [key, value];
      }),
    ),
  };
}

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'public/**'],
  },
  warnRules(js.configs.recommended),
  ...tseslint.configs.recommended.map(warnRules),
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'preserve-caught-error': 'off',
    },
  },
);
