module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: false,
  },
  extends: [
    'next/core-web-vitals','eslint:recommended', 'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [ 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-constant-condition': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
  },

}