import { CHATBOTS } from '../constants/chatbots'

export type Preset = {
  name?: string
  chatbot?: keyof typeof CHATBOTS
  prompt_prefix?: string
  prompt_suffix?: string
  model?: string
  temperature?: number
  top_p?: number
  thinking_budget?: number
  reasoning_effort?: string
  system_instructions?: string
  options?: string[]
  port?: number
  new_url?: string
  is_selected?: boolean
  is_collapsed?: boolean
  is_pinned?: boolean
}
