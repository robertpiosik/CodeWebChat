/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const crypto = require('crypto')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

/**
 * @type {import('webpack').Configuration[]}
 */
const config = [
  // Extension Configuration (Node.js environment)
  (env, argv) => {
    const isProduction = argv.mode == 'production'
    return {
      name: 'extension',
      mode: isProduction ? 'production' : 'development', 
      target: 'node',
      entry: {
        extension: './src/extension.ts',
        'websocket-server-process': './src/services/websocket-server-process.ts'
      },
      output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
      },
      devtool: isProduction ? 'source-map' : 'eval-source-map', // Use 'eval-source-map' for faster dev builds and good debugging
      externals: {
        vscode: 'commonjs vscode'
      },
      resolve: {
        extensions: ['.ts', '.js'],
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@shared': path.resolve(__dirname, '../shared/src')
        }
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env', '@babel/preset-typescript']
                }
              }
            ]
          }
        ]
      },
      plugins: [
        new CleanWebpackPlugin({
          cleanOnceBeforeBuildPatterns: ['../*.vsix'],
          dangerouslyAllowCleanPatternsOutsideProject: true,
          dry: false
        }),
        new CopyWebpackPlugin({
          patterns: [
            {
              from: '../../README.md',
              to: '../README.md'
            }
          ]
        })
      ],
      stats: 'errors-only'
    }
  },
  // View Configuration (Web environment)
  (env, argv) => {
    const isProduction = argv.mode == 'production'
    return {
      name: 'view',
      mode: isProduction ? 'production' : 'development',
      target: 'web',
      entry: {
        view: './src/view/frontend/App.tsx'
      },
      output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        devtoolModuleFilenameTemplate: '../[resource-path]'
      },
      performance: {
        hints: false
      },
      devtool: isProduction ? 'source-map' : 'eval-source-map', // Use 'eval-source-map' for dev
      resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@shared': path.resolve(__dirname, '../shared/src'),
          '@ui': path.resolve(__dirname, '../ui/src')
        }
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader']
          },
          {
            test: /\.scss$/,
            use: [
              MiniCssExtractPlugin.loader,
              {
                loader: 'css-loader',
                options: {
                  modules: {
                    getLocalIdent: (context, _, localName) => {
                      const filename = context.resourcePath
                      const isModule = /\.module\.(scss|css)$/i.test(filename)
                      if (isModule) {
                        const moduleName = path
                          .basename(filename)
                          .replace(/\.module\.(scss|css)$/i, '')
                        const hash = crypto
                          .createHash('md5')
                          .update(`${filename}${localName}`)
                          .digest('hex')
                          .substring(0, 5)
                        return `${moduleName}__${localName}__${hash}`
                      }
                      // Return original name for non-module files
                      return localName
                    }
                  },
                  importLoaders: 1
                }
              },
              {
                loader: 'sass-loader',
                options: {
                  additionalData: `@use "${path.resolve(
                    __dirname,
                    '../ui/src/styles/foundation'
                  )}" as *;`
                }
              }
            ]
          },
          {
            test: /\.(ts|tsx)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    '@babel/preset-env',
                    [
                      '@babel/preset-react',
                      {
                        runtime: 'automatic'
                      }
                    ],
                    '@babel/preset-typescript'
                  ]
                }
              }
            ]
          },
          {
            test: /\.svg$/,
            use: ['@svgr/webpack']
          }
        ]
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].css'
        })
      ],
      stats: 'errors-only'
    }
  }
]

module.exports = config
