import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginSass } from '@rsbuild/plugin-sass'
import { pluginSvgr } from '@rsbuild/plugin-svgr'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import * as fs from 'fs'
import * as path from 'path'

export default defineConfig({
  performance: {
    buildCache: true,
    chunkSplit: {
      strategy: 'all-in-one'
    }
  },
  tools: {
    rspack: {
      module: {
        parser: {
          javascript: {
            dynamicImportMode: 'eager'
          }
        }
      }
    }
  },
  environments: {
    node: {
      output: {
        target: 'node',
        distPath: {
          root: 'out',
          js: ''
        },
        externals: {
          vscode: 'commonjs vscode',
          canvas: 'commonjs canvas'
        }
      },
      source: {
        entry: {
          extension: './src/extension.ts',
          'websocket-server-process':
            './src/services/websocket-server-process.ts'
        }
      },
      plugins: [
        {
          name: 'copy-readme-plugin',
          setup(api) {
            api.onBeforeBuild(() => {
              const readmePath = path.resolve(__dirname, '../../README.md')
              const outReadmePath = path.resolve(__dirname, 'README.md')

              const content = fs.readFileSync(readmePath, 'utf8')
              const newContent = content
                .split('\n')
                .slice(12)
                .filter(
                  (line) =>
                    !['> [!TIP]', '> [!IMPORTANT]', '> [!NOTE]'].includes(
                      line.trim()
                    )
                )
                .join('\n')

              fs.writeFileSync(outReadmePath, newContent)
            })
          }
        }
      ]
    },
    web: {
      output: {
        target: 'web',
        distPath: {
          root: 'out',
          js: '',
          css: '',
          font: ''
        },
        assetPrefix: './',
        filenameHash: false
      },
      source: {
        entry: {
          prompt: './src/views/prompt/frontend/App.tsx',
          settings: './src/views/settings/frontend/App.tsx',
          chats: './src/views/chats/frontend/App.tsx'
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@shared': path.resolve(__dirname, '../../packages/shared/src'),
          '@ui': path.resolve(__dirname, '../../packages/ui/src')
        }
      },
      plugins: [
        pluginReact(),
        pluginSass({
          sassLoaderOptions: {
            additionalData: '@import "@ui/styles/foundation/_index.scss";'
          }
        }),
        pluginSvgr({
          svgrOptions: {
            exportType: 'named'
          }
        })
      ]
    }
  },
  plugins: [pluginTypeCheck()]
})
