const path = require('path');
const common = require('./webpack.common');
const { merge } = require('webpack-merge');


module.exports = merge(common, {
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/',
  },
  devServer: {
    historyApiFallback: true,
    client: {
      webSocketURL: "auto://0.0.0.0:0/ws"
    },
    allowedHosts: process.env.CODESPACES ? [".preview.app.github.dev"] : "auto"
  },
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
    ],
  },
});
