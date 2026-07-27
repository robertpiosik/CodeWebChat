import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_instructions = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'INSTRUCTIONS',
    ask_about_context: panel_view_provider.ask_about_context_instructions,
    edit_files: panel_view_provider.edit_files_instructions,
    no_context: panel_view_provider.no_context_instructions,
    code_at_cursor: panel_view_provider.code_at_cursor_instructions,
    find_relevant_files: panel_view_provider.find_relevant_files_instructions
  })
}
