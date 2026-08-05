import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { run_generate_action } from './actions/run-generate-action'

export const generate_commit_message_command = (
  extension_context: vscode.ExtensionContext,
  prompt_view_provider: PromptViewProvider,
  workspace_provider: WorkspaceProvider
) => {
  const generate_command = vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action({
        source_control,
        should_commit: false,
        extension_context,
        prompt_view_provider,
        workspace_provider
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
        workspace_provider
      })
    }
  )

  return vscode.Disposable.from(generate_command, generate_and_commit_command)
}
