type Agents = {
  [name: string]: {
    docs_url?: string
    homepage_url?: string
  }
}

export const AGENTS = {
  Antigravity: {
    docs_url: 'https://antigravity.google/docs/cli/headless/',
    homepage_url: 'https://antigravity.google/product/antigravity-cli/'
  },
  'Claude Code': {
    docs_url: 'https://code.claude.com/docs/en/headless',
    homepage_url: 'https://code.claude.com/docs/en/quickstart'
  },
  Codex: {
    docs_url: 'https://learn.chatgpt.com/docs/non-interactive-mode',
    homepage_url: 'https://learn.chatgpt.com/docs/codex/cli'
  },
  Cursor: {
    docs_url: 'https://cursor.com/docs/cli/headless',
    homepage_url: 'https://cursor.com/cli'
  },
  'Grok Build': {
    docs_url: 'https://docs.x.ai/build/cli/headless-scripting',
    homepage_url: 'https://x.ai/build'
  },
  'Muse Code': {
    docs_url: 'https://dev.meta.ai/docs/muse-code/extending#headless',
    homepage_url: 'https://dev.meta.ai/docs/muse-code'
  },
  OpenCode: {
    docs_url: 'https://opencode.ai/docs/cli/',
    homepage_url: 'https://opencode.ai/'
  }
} satisfies Agents
