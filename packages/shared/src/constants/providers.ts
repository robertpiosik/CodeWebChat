type Providers = {
  [name: string]: {
    base_url: string
  }
}

export const PROVIDERS = {
  Anthropic: {
    base_url: 'https://api.anthropic.com/v1'
  },
  Chutes: {
    base_url: 'https://llm.chutes.ai/v1'
  },
  DeepInfra: {
    base_url: 'https://api.deepinfra.com/v1'
  },
  DeepSeek: {
    base_url: 'https://api.deepseek.com/v1'
  },
  Fireworks: {
    base_url: 'https://api.fireworks.ai/inference/v1'
  },
  Gemini: {
    base_url: 'https://generativelanguage.googleapis.com/v1beta/openai'
  },
  Hyperbolic: {
    base_url: 'https://api.hyperbolic.xyz/v1'
  },
  Mistral: {
    base_url: 'https://api.mistral.ai/v1'
  },
  OpenAI: {
    base_url: 'https://api.openai.com/v1'
  },
  OpenRouter: {
    base_url: 'https://openrouter.ai/api/v1'
  },
  TogetherAI: {
    base_url: 'https://api.together.xyz/v1'
  }
} satisfies Providers
