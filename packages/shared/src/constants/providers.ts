type Providers = {
  [id: string]: {
    display_name: string
    base_url: string
  }
}

export const PROVIDERS = {
  gemini: {
    display_name: 'Gemini',
    base_url: 'https://generativelanguage.googleapis.com/v1beta'
  },
  openrouter: {
    display_name: 'OpenRouter',
    base_url: 'https://openrouter.ai/api/v1'
  }
} satisfies Providers
