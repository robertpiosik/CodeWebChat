import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import { CommitMessageDetails } from '@/utils/commit-message-details'
import { perform_code_at_cursor } from './utils/perform-code-at-cursor'

export const code_at_cursor_commands = (params: {
  workspace_provider: WorkspaceProvider
  open_editors_provider: OpenEditorsProvider
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
}) => {
  return [
    vscode.commands.registerCommand(
      'codeWebChat.internal.codeAtCursorAccepted',
      async (args: {
        workspace_root: string
        prompt: string
        file_path: string
        selected_files: string[]
      }) => {
        CommitMessageDetails.add({
          extension_context: params.extension_context,
          workspace_root: args.workspace_root,
          prompt: args.prompt,
          files: [args.file_path],
          selected_files: args.selected_files
        })
      }
    ),
    vscode.commands.registerCommand('codeWebChat.codeAtCursor', async () =>
      perform_code_at_cursor({
        workspace_provider: params.workspace_provider,
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
          workspace_provider: params.workspace_provider,
          open_editors_provider: params.open_editors_provider,
          extension_context: params.extension_context,
          with_completion_instructions: true,
          show_quick_pick: false
        })
    ),
    vscode.commands.registerCommand('codeWebChat.codeAtCursorUsing', async () =>
      perform_code_at_cursor({
        workspace_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        extension_context: params.extension_context,
        with_completion_instructions: false,
        show_quick_pick: true,
        prompt_view_provider: params.prompt_view_provider
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeAtCursorWithInstructionsUsing',
      async () =>
        perform_code_at_cursor({
          workspace_provider: params.workspace_provider,
          open_editors_provider: params.open_editors_provider,
          extension_context: params.extension_context,
          with_completion_instructions: true,
          show_quick_pick: true,
          prompt_view_provider: params.prompt_view_provider
        })
    )
  ]
}
