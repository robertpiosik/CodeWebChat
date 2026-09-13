import * as vscode from 'vscode'
import { PromptViewProvider } from '../../prompt-view-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { agentic_search } from './agentic-search'

let agentic_search_in_progress = false

export const handle_agentic_search = async (
  prompt_view_provider: PromptViewProvider
) => {
  if (agentic_search_in_progress) {
    vscode.window.showInformationMessage(
      t('views.prompt.handlers.handle-agentic-search.info.search-in-progress')
    )
    return
  }

  const query = prompt_view_provider.current_instructions

  agentic_search_in_progress = true
  try {
    const result = await agentic_search({
      workspace_provider: prompt_view_provider.workspace_provider,
      extension_context: prompt_view_provider.extension_context,
      websocket_manager: prompt_view_provider.websocket_server_instance,
      query
    })

    if (!result || result === 'back') return

    const currently_checked =
      prompt_view_provider.workspace_provider.get_checked_files()

    const unchecked_paths = result.matched_paths.filter(
      (file_path) => !result.selected_paths.includes(file_path)
    )

    const paths_to_apply = [
      ...new Set([
        ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
        ...result.selected_paths
      ])
    ]

    await prompt_view_provider.workspace_provider.set_checked_files(
      paths_to_apply
    )

    Logger.info({
      message: `Selected ${result.selected_paths.length} files from agentic search.`,
      data: { paths: result.selected_paths }
    })

    vscode.window.showInformationMessage(t('common.success.context-updated'))
  } finally {
    agentic_search_in_progress = false
  }
}
