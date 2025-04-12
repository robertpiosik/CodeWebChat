import type { StorybookConfig } from '@storybook/react-vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async (config) => {
    config.plugins?.push(
      svgr({
        exportAsDefault: true,
        svgrOptions: {},
      }),
    )
    
    return {
      ...config,
      css: {
        modules: {
          generateScopedName: (name, filename) => {
            const isModule = /\.module\.(scss|css)$/i.test(filename)
            if (isModule) {
              const moduleName = path
                .basename(filename)
                .replace(/\.module\.(scss|css)$/i, '')
              return `${moduleName}__${name}`
            }
            return name
          }
        },
        preprocessorOptions: {
          scss: {
            additionalData: `@use "${path.resolve(
              __dirname,
              '../src/styles/foundation'
            )}" as *;`
          }
        }
      },
      resolve: {
        alias: [
          {
            find: '@shared',
            replacement: path.resolve(__dirname, '../../shared/src')
          }
        ]
      }
    }
  }
}

export default config
