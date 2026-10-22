type Providers = {
  [name: string]: {
    base_url: string
  }
}

export const PROVIDERS = {
  Anthropic: {
    base_url: 'https://api.anthropic.com/v1'
  },
  Cerebras: {
    base_url: 'https://api.cerebras.ai/v1'
  },
  DeepSeek: {
    base_url: 'https://api.deepseek.com/v1'
  },
  Google: {
    base_url: 'https://generativelanguage.googleapis.com/v1beta/openai/v1'
  },
  'LM Studio': {
    base_url: 'http://localhost:1234/v1'
  },
  Meta: {
    base_url: 'https://api.meta.ai/v1'
  },
  Mistral: {
    base_url: 'https://api.mistral.ai/v1'
  },
  Ollama: {
    base_url: 'http://localhost:11434/v1'
  },
  OpenAI: {
    base_url: 'https://api.openai.com/v1'
  },
  OpenRouter: {
    base_url: 'https://openrouter.ai/api/v1'
  },
  TogetherAI: {
    base_url: 'https://api.together.xyz/v1'
  },
  xAI: {
    base_url: 'https://api.x.ai/v1'
  },
  'Z.AI': {
    base_url: 'https://api.z.ai/api/paas/v4'
  }
} satisfies Providers
