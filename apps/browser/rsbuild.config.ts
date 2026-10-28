import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import { pluginSass } from '@rsbuild/plugin-sass'

export default defineConfig({
  output: {
    distPath: {
      root: 'dist',
      js: '',
      css: ''
    },
    filenameHash: false,
    assetPrefix: './',
    copy: [
      { from: 'src/manifest.json', to: 'manifest.json' },
      { from: 'src/icons', to: 'icons' },
      { from: 'src/fonts', to: 'fonts' },
      { from: 'src/views/popup/index.css', to: 'index.css' }
    ]
  },
  html: {
    template({ entryName }) {
      if (entryName === 'popup') {
        return './src/views/popup/index.html'
      }
    }
  },
  source: {
    entry: {
      'send-prompt-content-script':
        './src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts',
      background: './src/background/main.ts',
      popup: './src/views/popup/App.tsx'
    }
  },
  performance: {
    chunkSplit: {
      strategy: 'all-in-one'
    }
  },
  plugins: [pluginReact(), pluginTypeCheck(), pluginSass()]
})
