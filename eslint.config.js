import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // react-hooks v7 architectural rules, enforced as errors (HLCE-254). The
      // component/context test stories (HLCE-223/225) added the safety net that
      // let us refactor the flagged effects; where a setState-in-effect is the
      // legitimate shape of an async fetch/poll initialiser (no cleaner idiom
      // without a data-fetching library), it carries a targeted, justified
      // eslint-disable at the call site rather than a blanket downgrade.
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/immutability': 'error',
    },
  }
);
