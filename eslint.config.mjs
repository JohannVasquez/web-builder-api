import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.mjs',
      '*.js',
      'src/shared/infrastructure/prisma/generated/**',
      'prisma.config.ts',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['prisma/seed.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: false, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        node: { extensions: ['.ts', '.js', '.json'] },
      },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/modules/*/domain/**' },
        { type: 'application', pattern: 'src/modules/*/application/**' },
        { type: 'infrastructure', pattern: 'src/modules/*/infrastructure/**' },
        { type: 'presentation', pattern: 'src/modules/*/presentation/**' },
        { type: 'shared', pattern: 'src/shared/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              allow: [{ to: { element: { type: ['domain', 'shared'] } } }],
            },
            {
              from: { element: { type: 'application' } },
              allow: [
                { to: { element: { type: ['domain', 'application', 'shared'] } } },
              ],
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: [
                {
                  to: {
                    element: {
                      type: ['domain', 'application', 'infrastructure', 'shared'],
                    },
                  },
                },
              ],
            },
            {
              from: { element: { type: 'presentation' } },
              allow: [
                {
                  to: {
                    element: {
                      type: ['domain', 'application', 'presentation', 'shared'],
                    },
                  },
                },
              ],
            },
            {
              from: { element: { type: 'shared' } },
              allow: [{ to: { element: { type: 'shared' } } }],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      // Falso positivo con expect(jest.Mocked.method): no hay `this` en juego.
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  prettier,
);
