import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { run_generate_action } from './actions/run-generate-action'
import { get_prompt_data } from './actions/get-prompt-data'
import { t } from '@/i18n'
import { get_repository_for_commit } from '@/utils/git-repository-utils'
import { display_token_count } from '@/utils/display-token-count'

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

  const copy_command = vscode.commands.registerCommand(
    'codeWebChat.copyCommitMessagePrompt',
    async (source_control?: vscode.SourceControl) => {
      const repository = await get_repository_for_commit(source_control)
      if (!repository) return
      const data = await get_prompt_data({
        repository,
        stage_all_if_none_staged: !!source_control
      })
      if (!data) return
      const { was_empty_stage, message_prompt } = data

      await vscode.env.clipboard.writeText(message_prompt)
      const token_count = Math.ceil(message_prompt.length / 4)
      vscode.window.showInformationMessage(
        t('command.generate-commit-message.copied', {
          tokens: display_token_count(token_count)
        })
      )

      if (was_empty_stage) {
        await vscode.commands.executeCommand('git.unstageAll', repository)
      }
    }
  )

  const apply_from_clipboard_command = vscode.commands.registerCommand(
    'codeWebChat.applyCommitMessageFromClipboard',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action({
        source_control,
        should_commit: false,
        from_clipboard: true,
        extension_context,
        prompt_view_provider,
        workspace_provider
      })
    }
  )

  return vscode.Disposable.from(
    generate_command,
    generate_and_commit_command,
    copy_command,
    apply_from_clipboard_command
  )
}
