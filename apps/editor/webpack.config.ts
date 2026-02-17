import * as path from 'path'
import * as crypto from 'crypto'
import * as webpack from 'webpack'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const config: ((env: any, argv: any) => webpack.Configuration)[] = [
  // Extension Configuration (Node.js environment)
  (env: any, argv: any): webpack.Configuration => {
    const is_production = argv.mode === 'production'
    return {
      name: 'extension',
      mode: is_production ? 'production' : 'development',
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
      devtool: is_production ? false : 'eval-source-map',
      cache: {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename]
        }
      },
      externals: {
        vscode: 'commonjs vscode'
      },
      resolve: {
        extensions: ['.ts', '.js'],
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@shared': path.resolve(__dirname, '../../packages/shared/src')
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
              to: '../README.md',
              transform(content) {
                return content
                  .toString()
                  .split('\n')
                  .slice(12)
                  .filter(
                    (line) =>
                      !['> [!TIP]', '> [!IMPORTANT]', '> [!NOTE]'].includes(
                        line.trim()
                      )
                  )
                  .join('\n')
              }
            }
          ]
        })
      ],
      stats: 'errors-only'
    }
  },
  // View Configuration (Web environment)
  (env: any, argv: any): webpack.Configuration => {
    const isProduction = argv.mode === 'production'
    return {
      name: 'view',
      mode: isProduction ? 'production' : 'development',
      target: 'web',
      entry: {
        view: './src/views/panel/frontend/App.tsx',
        settings: './src/views/settings/frontend/App.tsx'
      },
      output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        devtoolModuleFilenameTemplate: '../[resource-path]'
      },
      performance: {
        hints: false
      },
      devtool: isProduction ? false : 'eval-source-map',
      cache: {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename]
        }
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@shared': path.resolve(__dirname, '../../packages/shared/src'),
          '@ui': path.resolve(__dirname, '../../packages/ui/src')
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
                    getLocalIdent: (
                      context: webpack.LoaderContext<any>,
                      _: any,
                      localName: string
                    ) => {
                      const filename = context.resourcePath
                      const isModule = /\.module\.(scss|css)$/i.test(filename)
                      if (isModule) {
                        const moduleName = path
                          .basename(filename as string)
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
                  additionalData: `@use "${path
                    .resolve(
                      __dirname,
                      '../../packages/ui/src/styles/foundation'
                    )
                    .replace(/\\/g, '/')}" as *;`
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
        }) as unknown as webpack.WebpackPluginInstance
      ] as webpack.WebpackPluginInstance[],
      stats: 'errors-only'
    }
  }
]

export default config
