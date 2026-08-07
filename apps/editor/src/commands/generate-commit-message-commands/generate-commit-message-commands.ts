import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { run_generate_action } from './actions/run-generate-action'
import { WebSocketManager } from '@/services/websocket-manager'

export const generate_commit_message_commands = (
  extension_context: vscode.ExtensionContext,
  prompt_view_provider: PromptViewProvider,
  workspace_provider: WorkspaceProvider,
  websocket_manager: WebSocketManager
) => {
  const generate_command = vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action({
        source_control,
        should_commit: false,
        extension_context,
        prompt_view_provider,
        workspace_provider,
        websocket_manager
      })
    }
  )

  const generate_and_commit_command = vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessageAndCommit',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action({
        source_control,
        should_commit: true,
        extension_context,
        prompt_view_provider,
        workspace_provider,
        websocket_manager
      })
    }
  )

  const apply_from_clipboard_palette_command = vscode.commands.registerCommand(
    'codeWebChat.applyCommitMessageFromClipboardPalette',
    async () => {
      await run_generate_action({
        should_commit: true,
        from_clipboard: true,
        extension_context,
        prompt_view_provider,
        workspace_provider,
        websocket_manager
      })
    }
  )

  return vscode.Disposable.from(
    generate_command,
    generate_and_commit_command,
    apply_from_clipboard_palette_command
  )
}
