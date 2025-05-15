type Providers = {
  [name: string]: {
    base_url: string
  }
}

export const PROVIDERS = {
  Gemini: {
    base_url: 'https://generativelanguage.googleapis.com/v1beta'
  },
  OpenRouter: {
    base_url: 'https://openrouter.ai/api/v1'
  }
} satisfies Providers
