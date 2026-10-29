type Agents = {
  [name: string]: {
    docs_url?: string
    homepage_url?: string
    flags_placeholder: string
    example_flags: string[]
  }
}

export const AGENTS = {
  Antigravity: {
    docs_url: 'https://antigravity.google/docs/cli/headless/',
    homepage_url: 'https://antigravity.google/product/antigravity-cli/',
    flags_placeholder: "--model 'Gemini 3.8 Flash (High)'",
    example_flags: [
      "--model 'Gemini 4 Argon (High)'",
      "--model 'Gemini 4 Argon (Medium)'",
      "--model 'Gemini 4 Argon (Low)'",
      "--model 'Gemini 3.8 Flash (High)'",
      "--model 'Gemini 3.8 Flash (Medium)'",
      "--model 'Gemini 3.8 Flash (Low)'"
    ]
  },
  'Claude Code': {
    docs_url: 'https://code.claude.com/docs/en/headless',
    homepage_url: 'https://code.claude.com/docs/en/quickstart',
    flags_placeholder: '--model claude-sonnet-5-5 --effort high',
    example_flags: [
      '--model claude-opus-5-5 --effort high',
      '--model claude-opus-5-5 --effort medium',
      '--model claude-opus-5-5 --effort low',
      '--model claude-sonnet-5-5 --effort high',
      '--model claude-sonnet-5-5 --effort medium',
      '--model claude-sonnet-5-5 --effort low',
      '--model claude-haiku-5-5 --effort high',
      '--model claude-haiku-5-5 --effort medium',
      '--model claude-haiku-5-5 --effort low'
    ]
  },
  Codex: {
    docs_url: 'https://learn.chatgpt.com/docs/non-interactive-mode',
    homepage_url: 'https://learn.chatgpt.com/docs/codex/cli',
    flags_placeholder: '--model gpt-6.1-sol -c model_reasoning_effort=high',
    example_flags: [
      '--model gpt-6.1-sol -c model_reasoning_effort=high',
      '--model gpt-6.1-sol -c model_reasoning_effort=medium',
      '--model gpt-6.1-sol -c model_reasoning_effort=low',
      '--model gpt-6-luna -c model_reasoning_effort=high',
      '--model gpt-6-luna -c model_reasoning_effort=medium',
      '--model gpt-6-luna -c model_reasoning_effort=low'
    ]
  },
  Cursor: {
    docs_url: 'https://cursor.com/docs/cli/reference/parameters',
    homepage_url: 'https://cursor.com/cli',
    flags_placeholder: '',
    example_flags: []
  },
  'Grok Build': {
    docs_url: 'https://docs.x.ai/build/cli/headless-scripting',
    homepage_url: 'https://x.ai/build',
    flags_placeholder: '',
    example_flags: []
  },
  OpenCode: {
    docs_url: 'https://opencode.ai/v2/docs',
    homepage_url: 'https://opencode.ai/',
    flags_placeholder: '-m deepseek/deepseek-flash#high',
    example_flags: [
      '-m deepseek/deepseek-flash#high',
      '-m deepseek/deepseek-flash#low'
    ]
  }
} satisfies Agents
