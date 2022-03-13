const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

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
        test: /\.(png|jpe?g|gif|otf|ttf|woff|woff2)$/,
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
    new FaviconsWebpackPlugin({
      logo: './public/res/svg/cinny.svg',
      mode: 'webapp',
      devMode: 'light',
      favicons: {
        appName: 'Cinny',
        appDescription: 'Yet another matrix client',
        developerName: 'Ajay Bura',
        developerURL: 'https://github.com/ajbura',
        icons: {
          coast: false,
          yandex: false,
          appleStartup: false,
        }
      }
    }),
    new CopyPlugin({
      patterns: [
        { from: 'olm.wasm' },
        { from: '_redirects' },
        { from: 'config.json' },
      ],
    }),
  ],
};
