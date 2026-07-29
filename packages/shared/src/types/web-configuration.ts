import { CHATBOTS } from '../constants/chatbots'

export type WebConfiguration = {
  name?: string
  chatbot?: keyof typeof CHATBOTS
  model?: string
  reasoning_effort?: string
  system_instructions?: string
  options?: string[]
  port?: number
  new_url?: string
  is_pinned?: boolean
}
