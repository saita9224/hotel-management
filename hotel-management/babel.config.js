module.exports = function (api) {
  api.cache(true);
  const plugins = [
    [
      'module-resolver',
      {
        alias: {
          '@': './app', // 👈 points to your app folder
        },
      },
    ],
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ];

  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};