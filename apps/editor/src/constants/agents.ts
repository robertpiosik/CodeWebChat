type Agents = {
  [name: string]: {
    docs_url?: string
    homepage_url?: string
  }
}

export const AGENTS = {
  Antigravity: {
    docs_url: 'https://antigravity.google/docs/cli/headless/',
    homepage_url: 'https://antigravity.google/'
  },
  'Claude Code': {
    docs_url: 'https://code.claude.com/docs/en/headless',
    homepage_url: 'https://code.claude.com'
  },
  Codex: {
    docs_url: 'https://learn.chatgpt.com/docs/non-interactive-mode',
    homepage_url: 'https://learn.chatgpt.com'
  },
  Cursor: {
    docs_url: 'https://cursor.com/docs/cli/headless',
    homepage_url: 'https://cursor.com'
  },
  'Grok Build': {
    docs_url: 'https://docs.x.ai/build/cli/headless-scripting',
    homepage_url: 'https://x.ai/grok'
  },
  'Muse Code': {
    docs_url: 'https://dev.meta.ai/docs/muse-code/extending#headless',
    homepage_url: 'https://dev.meta.ai'
  },
  OpenCode: {
    docs_url: 'https://opencode.ai/docs/cli/',
    homepage_url: 'https://opencode.ai'
  }
} satisfies Agents
