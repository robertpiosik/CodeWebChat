export type Provider = 'Gemini API' | 'OpenRouter'

export type ApiToolSettings = {
  provider?: Provider
  model?: string
  temperature?: number
}
