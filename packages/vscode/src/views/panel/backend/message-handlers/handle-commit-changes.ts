import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import {
  get_git_repository,
  prepare_staged_changes
} from '@/utils/git-repository-utils'
import { dictionary } from '@shared/constants/dictionary'
import {
  generate_commit_message_from_diff,
  get_commit_message_config
} from '@/utils/commit-message-generator'
import { ViewProvider } from '@/views/panel/backend/view-provider'

export const handle_commit_changes = async (
  provider: ViewProvider
): Promise<void> => {
  const repository = get_git_repository()
  if (!repository) return

  try {
    const api_config = await get_commit_message_config(provider.context)
    if (!api_config) return

    const diff = await prepare_staged_changes(repository)
    if (!diff) return

    const commit_message = await generate_commit_message_from_diff({
      context: provider.context,
      repository,
      diff,
      api_config,
      view_provider: provider
    })

    if (!commit_message) return

    provider.send_message({
      command: 'SHOW_COMMIT_MESSAGE_MODAL',
      commit_message
    })
  } catch (error) {
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
