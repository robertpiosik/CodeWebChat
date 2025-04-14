export type Preset = {
  name: string
  chatbot: string
  prompt_prefix?: string
  prompt_suffix?: string
  model?: string
  temperature?: number
  system_instructions?: string
  options?: string[]
  port?: number
}
