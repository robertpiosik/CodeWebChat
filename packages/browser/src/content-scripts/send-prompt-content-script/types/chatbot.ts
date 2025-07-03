export type Chatbot = {
  wait_until_ready?: () => Promise<void>
  set_options?: (options: string[]) => Promise<void>
  set_model?: (model: string) => Promise<void>
  set_temperature?: (temperature: number) => Promise<void>
  set_top_p?: (top_p: number) => Promise<void>
  set_thinking_budget?: (thinking_budget: number) => Promise<void>
  enter_system_instructions?: (instructions: string) => Promise<void>
  inject_apply_response_button?: (client_id: number) => void
  enter_message_and_send?: (message: string) => Promise<void>
}
