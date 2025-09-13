import { ViewProvider } from '@/views/panel/backend/view-provider'

export const handle_get_instructions = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'INSTRUCTIONS',
    ask: provider.ask_instructions,
    edit_context: provider.edit_instructions,
    no_context: provider.no_context_instructions,
    code_completions: provider.code_completion_instructions
  })
}
