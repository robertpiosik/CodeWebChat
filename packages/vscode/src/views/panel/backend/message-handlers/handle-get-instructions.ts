import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_instructions = (
  panel_provider: PanelProvider
): void => {
  panel_provider.send_message({
    command: 'INSTRUCTIONS',
    ask: panel_provider.ask_instructions,
    edit_context: panel_provider.edit_instructions,
    no_context: panel_provider.no_context_instructions,
    code_completions: panel_provider.code_completion_instructions
  })
}
