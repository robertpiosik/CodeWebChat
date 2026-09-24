type Agents = {
  [name: string]: {
    docs_url?: string
  }
}

export const AGENTS = {
  Antigravity: {
    docs_url: 'https://antigravity.google/docs/cli/headless/'
  },
  'Claude Code': { docs_url: 'https://code.claude.com/docs/en/headless' },
  Codex: {
    docs_url: 'https://learn.chatgpt.com/docs/non-interactive-mode'
  },
  Cursor: { docs_url: 'https://cursor.com/docs/cli/headless' },
  'Grok Build': { docs_url: 'https://docs.x.ai/build/cli/headless-scripting' },
  'Muse Code': { docs_url: 'https://dev.meta.ai/docs/muse-code/extending#headless' },
  OpenCode: { docs_url: 'https://opencode.ai/docs/cli/' }
} satisfies Agents
