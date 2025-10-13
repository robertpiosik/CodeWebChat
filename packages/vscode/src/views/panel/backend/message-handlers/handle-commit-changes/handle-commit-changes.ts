import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import {
  get_git_repository,
  prepare_staged_changes
} from '@/utils/git-repository-utils'
import { dictionary } from '@shared/constants/dictionary'
import { ViewProvider } from '../../panel-provider'
import {
  generate_commit_message_from_diff,
  get_commit_message_config
} from './utils'

export const handle_commit_changes = async (
  provider: ViewProvider
): Promise<void> => {
  const repository = get_git_repository()
  if (!repository) {
    provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
    return
  }

  provider.commit_was_staged_by_script = false
  const was_empty_stage = repository.state.indexChanges.length === 0

  try {
    const api_config = await get_commit_message_config(provider.context)
    if (!api_config) {
      provider.send_message({ command: 'COMMIT_PROCESS_CANCELLED' })
      return
    }

    const diff = await prepare_staged_changes(repository)
    if (!diff) {
      return
    }

    if (was_empty_stage && repository.state.indexChanges.length > 0) {
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
      function_name: 'handle_commit_changes',
      message: 'Error in commit changes command',
      data: error
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_COMMITTING_CHANGES
    )
  }
}
