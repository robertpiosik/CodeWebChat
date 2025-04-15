import { CHATBOTS } from '@shared/constants/chatbots'

export type Preset = {
  name: string
  chatbot: keyof typeof CHATBOTS
  prompt_prefix?: string
  prompt_suffix?: string
  model?: string
  temperature?: number
  system_instructions?: string
  options?: string[]
  port?: number
}
