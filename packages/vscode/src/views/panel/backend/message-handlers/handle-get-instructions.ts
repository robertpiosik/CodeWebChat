import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_instructions = (provider: PanelProvider): void => {
  provider.send_message({
    command: 'INSTRUCTIONS',
    ask: provider.ask_instructions,
    edit_context: provider.edit_instructions,
    no_context: provider.no_context_instructions,
    code_completions: provider.code_completion_instructions
  })
}
