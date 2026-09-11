import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { agentic_search } from './agentic-search'

let agentic_search_in_progress = false

export const agentic_search_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.agenticSearch',
    async () => {
      if (agentic_search_in_progress) {
        vscode.window.showInformationMessage(
          t('feature.search-files.info.search-in-progress')
        )
        return
      }
      agentic_search_in_progress = true
      try {
        const result = await agentic_search({
          workspace_provider,
          extension_context
        })

        if (!result || result === 'back') return

        const currently_checked = workspace_provider.get_checked_files()

        const unchecked_paths = result.matched_paths.filter(
          (file_path) => !result.selected_paths.includes(file_path)
        )

        const paths_to_apply = [
          ...new Set([
            ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
            ...result.selected_paths
          ])
        ]

        await workspace_provider.set_checked_files(paths_to_apply)

        Logger.info({
          message: `Selected ${result.selected_paths.length} files from agentic search.`,
          data: { paths: result.selected_paths }
        })

        vscode.window.showInformationMessage(t('common.success.context-updated'))
      } finally {
        agentic_search_in_progress = false
      }
    }
  )
}