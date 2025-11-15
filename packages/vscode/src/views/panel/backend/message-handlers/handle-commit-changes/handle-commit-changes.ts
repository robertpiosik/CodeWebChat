import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { get_git_repository, GitRepository } from '@/utils/git-repository-utils'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '../../panel-provider'
import {
  generate_commit_message_from_diff,
  get_commit_message_config
} from './utils'
import * as path from 'path'
import { execSync } from 'child_process'
import { handle_accept_commit_message } from '../handle-accept-commit-message'

async function proceed_with_commit_generation(
  panel_provider: PanelProvider,
  repository: GitRepository,
  was_empty_stage: boolean
) {
  try {
    const api_config = await get_commit_message_config(panel_provider.context)
    if (!api_config) {
      panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      return
    }

    const diff = execSync('git diff --staged', {
      cwd: repository.rootUri.fsPath
    }).toString()

    if (!diff || diff.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_CHANGES_TO_COMMIT
      )
      panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      return
    }

    if (was_empty_stage) {
      panel_provider.commit_was_staged_by_script = true
    }

    const commit_message = await generate_commit_message_from_diff({
      context: panel_provider.context,
      repository,
      diff,
      api_config,
      panel_provider: panel_provider
    })

    if (!commit_message) {
      if (panel_provider.commit_was_staged_by_script) {
        await vscode.commands.executeCommand('git.unstageAll')
      }
      panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      panel_provider.commit_was_staged_by_script = false
      return
    }

    const auto_accept_after = vscode.workspace
      .getConfiguration('codeWebChat')
      .get<number>('commitMessageAutoAcceptAfter')

    if (auto_accept_after && auto_accept_after > 0) {
      panel_provider.send_message({
        command: 'SHOW_COMMIT_MESSAGE_MODAL',
        commit_message,
        auto_accept_after_seconds: auto_accept_after
      })
    } else {
      await handle_accept_commit_message(panel_provider, commit_message)
      panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      panel_provider.commit_was_staged_by_script = false
      const commit_message_lines = commit_message.split('\n')
      const shortened_commit_message = commit_message_lines.length
        ? `${commit_message_lines[0]}...`
        : commit_message_lines[0]
      vscode.window.showInformationMessage(
        dictionary.information_message.COMMIT_CREATED_SUCCESSFULLY(
          shortened_commit_message
        )
      )
    }
  } catch (error) {
    if (panel_provider.commit_was_staged_by_script) {
      await vscode.commands.executeCommand('git.unstageAll')
    }
    panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    panel_provider.commit_was_staged_by_script = false
    Logger.error({
      function_name: 'proceed_with_commit_generation',
      message: 'Error in commit changes command',
      data: error
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_COMMITTING_CHANGES
    )
  }
}

export const handle_commit_changes = async (
  panel_provider: PanelProvider
): Promise<void> => {
  await vscode.workspace.saveAll()

  const repository = get_git_repository()
  if (!repository) {
    panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    return
  }

  await repository.status()

  panel_provider.commit_was_staged_by_script = false
  if (repository.state.indexChanges.length > 0) {
    await proceed_with_commit_generation(panel_provider, repository, false)
  } else if (repository.state.workingTreeChanges.length > 0) {
    const unstaged_files = repository.state.workingTreeChanges.map(
      (change: any) =>
        path.relative(repository.rootUri.fsPath, change.uri.fsPath)
    )

    if (unstaged_files.length == 1) {
      await handle_proceed_with_commit(panel_provider, unstaged_files)
    } else {
      panel_provider.send_message({
        command: 'SHOW_STAGE_FILES_MODAL',
        files: unstaged_files
      })
    }
  } else {
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CHANGES_TO_COMMIT
    )
    panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
  }
}

export const handle_proceed_with_commit = async (
  panel_provider: PanelProvider,
  files_to_stage: string[]
): Promise<void> => {
  const repository = get_git_repository()
  if (!repository) {
    panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    return
  }

  if (files_to_stage.length === 0) {
    panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    return
  }

  try {
    // Convert relative paths to absolute URIs
    const uris_to_stage = files_to_stage.map(
      (file_path) => vscode.Uri.joinPath(repository.rootUri, file_path).fsPath
    )

    await repository.add(uris_to_stage)
    await new Promise((resolve) => setTimeout(resolve, 500))
    await proceed_with_commit_generation(panel_provider, repository, true)
  } catch (error) {
    panel_provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    Logger.error({
      function_name: 'handle_proceed_with_commit',
      message: 'Error staging files',
      data: error
    })
    vscode.window.showErrorMessage(
      'Error staging files. See output for more details.'
    )
  }
}
