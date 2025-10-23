import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { get_git_repository, GitRepository } from '@/utils/git-repository-utils'
import { dictionary } from '@shared/constants/dictionary'
import { ViewProvider } from '../../panel-provider'
import {
  generate_commit_message_from_diff,
  get_commit_message_config
} from './utils'
import * as path from 'path'
import { execSync } from 'child_process'

async function proceed_with_commit_generation(
  provider: ViewProvider,
  repository: GitRepository,
  was_empty_stage: boolean
) {
  try {
    const api_config = await get_commit_message_config(provider.context)
    if (!api_config) {
      provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      return
    }

    const diff = execSync('git diff --staged', {
      cwd: repository.rootUri.fsPath
    }).toString()

    if (!diff || diff.length === 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_CHANGES_TO_COMMIT
      )
      provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      return
    }

    if (was_empty_stage) {
      provider.commit_was_staged_by_script = true
    }

    const commit_message = await generate_commit_message_from_diff({
      context: provider.context,
      repository,
      diff,
      api_config,
      view_provider: provider
    })

    if (!commit_message) {
      if (provider.commit_was_staged_by_script) {
        await vscode.commands.executeCommand('git.unstageAll')
      }
      provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      provider.commit_was_staged_by_script = false
      return
    }

    provider.send_message({
      command: 'SHOW_COMMIT_MESSAGE_MODAL',
      commit_message
    })
  } catch (error) {
    if (provider.commit_was_staged_by_script) {
      await vscode.commands.executeCommand('git.unstageAll')
    }
    provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    provider.commit_was_staged_by_script = false
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
  provider: ViewProvider
): Promise<void> => {
  await vscode.workspace.saveAll()

  const repository = get_git_repository()
  if (!repository) {
    provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    return
  }

  await repository.status()

  provider.commit_was_staged_by_script = false
  if (repository.state.indexChanges.length > 0) {
    await proceed_with_commit_generation(provider, repository, false)
  } else if (repository.state.workingTreeChanges.length > 0) {
    const unstaged_files = repository.state.workingTreeChanges.map(
      (change: any) =>
        path.relative(repository.rootUri.fsPath, change.uri.fsPath)
    )

    if (unstaged_files.length == 1) {
      await handle_proceed_with_commit(provider, unstaged_files)
    } else {
      provider.send_message({
        command: 'SHOW_STAGE_FILES_MODAL',
        files: unstaged_files
      })
    }
  } else {
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CHANGES_TO_COMMIT
    )
    provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
  }
}

export const handle_proceed_with_commit = async (
  provider: ViewProvider,
  files_to_stage: string[]
): Promise<void> => {
  const repository = get_git_repository()
  if (!repository) {
    provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    return
  }

  if (files_to_stage.length === 0) {
    provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    return
  }

  try {
    // Convert relative paths to absolute URIs
    const uris_to_stage = files_to_stage.map(
      (file_path) => vscode.Uri.joinPath(repository.rootUri, file_path).fsPath
    )

    await repository.add(uris_to_stage)
    await new Promise((resolve) => setTimeout(resolve, 500))
    await proceed_with_commit_generation(provider, repository, true)
  } catch (error) {
    provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
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
