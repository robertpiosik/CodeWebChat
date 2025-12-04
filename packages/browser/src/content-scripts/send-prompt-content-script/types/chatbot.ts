import { Chat } from '@shared/types/websocket-message'

export type Chatbot = {
  wait_until_ready?: () => Promise<void>
  set_options?: (chat: Chat) => Promise<void>
  set_model?: (chat: Chat) => Promise<void>
  set_temperature?: (chat: Chat) => Promise<void>
  set_top_p?: (chat: Chat) => Promise<void>
  set_thinking_budget?: (chat: Chat) => Promise<void>
  set_reasoning_effort?: (chat: Chat) => Promise<void>
  enter_system_instructions?: (chat: Chat) => Promise<void>
  inject_apply_response_button?: (
    client_id: number,
    raw_instructions?: string,
    edit_format?: string
  ) => void
  enter_message_and_send?: (params: {
    message: string
    without_submission?: boolean
  }) => Promise<void>
}
