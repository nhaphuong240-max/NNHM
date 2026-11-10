const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

/** ESLint 9 flat config. Uses the published recommended sets and does not turn rules off to force a pass. */
module.exports = [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
];
