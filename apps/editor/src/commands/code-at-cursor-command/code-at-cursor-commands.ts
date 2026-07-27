import * as vscode from 'vscode'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { perform_code_at_cursor } from './utils/perform-code-at-cursor'

export const code_at_cursor_commands = (params: {
  file_tree_provider: any
  open_editors_provider: any
  extension_context: vscode.ExtensionContext
  panel_view_provider: PanelViewProvider
}) => {
  return [
    vscode.commands.registerCommand('codeWebChat.codeAtCursor', async () =>
      perform_code_at_cursor({
        file_tree_provider: params.file_tree_provider,
        open_editors_provider: params.open_editors_provider,
        extension_context: params.extension_context,
        with_completion_instructions: false,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeAtCursorWithInstructions',
      async () =>
        perform_code_at_cursor({
          file_tree_provider: params.file_tree_provider,
          open_editors_provider: params.open_editors_provider,
          extension_context: params.extension_context,
          with_completion_instructions: true,
          show_quick_pick: false
        })
    ),
    vscode.commands.registerCommand('codeWebChat.codeAtCursorUsing', async () =>
      perform_code_at_cursor({
        file_tree_provider: params.file_tree_provider,
        open_editors_provider: params.open_editors_provider,
        extension_context: params.extension_context,
        with_completion_instructions: false,
        show_quick_pick: true,
        panel_view_provider: params.panel_view_provider
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeAtCursorWithInstructionsUsing',
      async () =>
        perform_code_at_cursor({
          file_tree_provider: params.file_tree_provider,
          open_editors_provider: params.open_editors_provider,
          extension_context: params.extension_context,
          with_completion_instructions: true,
          show_quick_pick: true,
          panel_view_provider: params.panel_view_provider
        })
    )
  ]
}
