type Agents = {
  [name: string]: {
    docs_url?: string
    homepage_url?: string
    flags_placeholder: string
  }
}

export const AGENTS = {
  Antigravity: {
    docs_url: 'https://antigravity.google/docs/cli/headless/',
    homepage_url: 'https://antigravity.google/product/antigravity-cli/',
    flags_placeholder: "--model 'Gemini 3.8 Flash (High)'"
  },
  'Claude Code': {
    docs_url: 'https://code.claude.com/docs/en/headless',
    homepage_url: 'https://code.claude.com/docs/en/quickstart',
    flags_placeholder: ''
  },
  Codex: {
    docs_url: 'https://learn.chatgpt.com/docs/non-interactive-mode',
    homepage_url: 'https://learn.chatgpt.com/docs/codex/cli',
    flags_placeholder: ''
  },
  Cursor: {
    docs_url: 'https://cursor.com/docs/cli/headless',
    homepage_url: 'https://cursor.com/cli',
    flags_placeholder: ''
  },
  'Grok Build': {
    docs_url: 'https://docs.x.ai/build/cli/headless-scripting',
    homepage_url: 'https://x.ai/build',
    flags_placeholder: ''
  },
  'Muse Code': {
    docs_url: 'https://dev.meta.ai/docs/muse-code/extending#headless',
    homepage_url: 'https://dev.meta.ai/docs/muse-code',
    flags_placeholder: ''
  },
  OpenCode: {
    docs_url: 'https://opencode.ai/docs/cli/',
    homepage_url: 'https://opencode.ai/',
    flags_placeholder: ''
  }
} satisfies Agents
