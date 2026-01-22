import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_instructions = (
  panel_provider: PanelProvider
): void => {
  panel_provider.send_message({
    command: 'INSTRUCTIONS',
    ask_about_context: panel_provider.ask_about_context_instructions,
    edit_context: panel_provider.edit_context_instructions,
    no_context: panel_provider.no_context_instructions,
    code_at_cursor: panel_provider.code_at_cursor_instructions,
    prune_context: panel_provider.prune_context_instructions
  })
}
