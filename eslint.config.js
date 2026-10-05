import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // 1. Thư mục bỏ qua
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'fixtures/**',
    ],
  },

  // 2. Cấu hình cơ bản JS & TS
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  // 3. Cấu hình Project Service
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // 4. Cưỡng chế luật cấm Node.js API trong src/core
  {
    files: ['src/core/**/*.{js,mjs,cjs,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs', message: 'Không được dùng module fs trong src/core.' },
            { name: 'path', message: 'Không được dùng module path trong src/core.' },
            { name: 'fs/promises', message: 'Không được dùng module fs/promises trong src/core.' },
          ],
          patterns: [
            {
              group: ['node:*'],
              message: 'src/core phải là pure TypeScript, không phụ thuộc vào built-in modules của Node.js.',
            },
          ],
        },
      ],
    },
  },
]);