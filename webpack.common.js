const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require('webpack');

module.exports = {
  entry: {
    polyfill: 'babel-polyfill',
    main: './src/index.jsx'
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      'crypto': require.resolve('crypto-browserify'),
      'path': require.resolve('path-browserify'),
      'fs': require.resolve('browserify-fs'),
      'stream': require.resolve('stream-browserify'),
      'util': require.resolve('util/'),
      'assert': require.resolve('assert/'),
      'url': require.resolve('url/'),
      'buffer': require.resolve('buffer'),
    }
  },
  node: {
    global: true,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.html$/,
        use: ['html-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|otf|ttf|woff|woff2|ogg)$/,
        type: 'asset/resource',
      },
      {
        test: /\.svg$/,
        type: 'asset/inline',
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new CopyPlugin({
      patterns: [
        { from: 'node_modules/@matrix-org/olm/olm.wasm' },
        { from: '_redirects' },
        { from: 'config.json' },
        { from: 'public/res/android'}
      ],
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};
