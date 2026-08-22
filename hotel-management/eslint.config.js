// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    languageOptions: {
      parserOptions: {
        babelOptions: {
          presets: ['babel-preset-expo'],
          plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
        },
      },
    },
    ignores: ['dist/*'],
  },
]);
