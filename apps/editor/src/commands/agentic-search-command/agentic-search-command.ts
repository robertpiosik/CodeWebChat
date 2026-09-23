import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { WebSocketManager } from '@/services/websocket-manager'
import { agentic_search, AgenticSearchState } from '@/features/agentic-search'
import { t } from '@/i18n'
import { Logger } from '@shared/utils/logger'

export const agentic_search_command = (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
  agentic_search_state: AgenticSearchState
}): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.agenticSearch',
    async () => {
      if (params.agentic_search_state.in_progress) {
        vscode.window.showInformationMessage(
          t('common.info.search-in-progress')
        )
        return
      }

      params.agentic_search_state.in_progress = true
      try {
        const result = await agentic_search({
          workspace_provider: params.workspace_provider,
          extension_context: params.extension_context,
          websocket_manager: params.websocket_manager,
          query: '',
          current_instructions: ''
        })

        if (!result || result === 'back') return

        const currently_checked = params.workspace_provider.get_checked_files()

        const unchecked_paths = result.matched_paths.filter(
          (file_path) => !result.selected_paths.includes(file_path)
        )

        const paths_to_apply = [
          ...new Set([
            ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
            ...result.selected_paths
          ])
        ]

        await params.workspace_provider.set_checked_files(paths_to_apply)

        Logger.info({
          message: `Selected ${result.selected_paths.length} files from agentic search.`,
          data: { paths: result.selected_paths }
        })

        vscode.window.showInformationMessage(
          t('common.success.context-updated')
        )
      } finally {
        params.agentic_search_state.in_progress = false
      }
    }
  )
}
