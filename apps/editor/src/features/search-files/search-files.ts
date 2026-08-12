import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY } from '@/constants/state-keys'
import { prompt_for_search_mode } from './utils/prompt-for-search-mode'
import { perform_phrase_search_mode } from './search-modes/perform-phrase-search-mode'
import { perform_keywords_search_mode } from './search-modes/perform-keywords-search-mode'
import { perform_semantic_search_mode } from './search-modes/perform-semantic-search-mode'
import { perform_intelligent_search_mode } from './search-modes/perform-intelligent-search-mode'
import { Logger } from '@shared/utils/logger'
import { WebSocketManager } from '@/services/websocket-manager'

export const search_files = async (params: {
  get_files: () => Promise<string[]>
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
  show_back_button?: boolean
  is_sub_search?: boolean
  disable_semantic?: boolean
}): Promise<
  { selected_paths: string[]; matched_paths: string[] } | undefined | 'back'
> => {
  let initial_search_mode =
    params.extension_context.workspaceState.get<
      'phrase' | 'keywords' | 'intelligent' | 'semantic'
    >(LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY) || 'phrase'

  let _resolved_files: string[] | undefined
  const resolve_files = async () => {
    if (!_resolved_files) {
      _resolved_files = await params.get_files()
    }
    return _resolved_files
  }

  const search_in_results = async (matched_paths: string[]) => {
    return search_files({
      get_files: async () => matched_paths,
      workspace_provider: params.workspace_provider,
      extension_context: params.extension_context,
      websocket_manager: params.websocket_manager,
      show_back_button: true,
      is_sub_search: true
    })
  }

  while (true) {
    try {
      const mode_result = await prompt_for_search_mode(
        initial_search_mode,
        params.show_back_button,
        params.disable_semantic || params.is_sub_search
      )

      if (mode_result == 'back') return 'back'
      if (!mode_result) return undefined

      initial_search_mode = mode_result
      const search_mode = mode_result

      await params.extension_context.workspaceState.update(
        LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY,
        search_mode
      )

      let flow_result:
        | { selected_paths: string[]; matched_paths: string[] }
        | undefined
        | 'back' = undefined

      const flow_params = {
        resolve_files,
        workspace_provider: params.workspace_provider,
        extension_context: params.extension_context,
        show_back_button: params.show_back_button,
        search_in_results
      }

      if (search_mode == 'phrase') {
        flow_result = await perform_phrase_search_mode(flow_params)
      } else if (search_mode == 'keywords') {
        flow_result = await perform_keywords_search_mode(flow_params)
      } else if (search_mode == 'semantic') {
        flow_result = await perform_semantic_search_mode(flow_params)
      } else if (search_mode == 'intelligent') {
        const files = await resolve_files()
        flow_result = await perform_intelligent_search_mode({
          files,
          workspace_provider: params.workspace_provider,
          extension_context: params.extension_context,
          websocket_manager: params.websocket_manager,
          show_back_button: params.show_back_button,
          search_in_results
        })
      }

      if (flow_result === 'back') {
        continue
      }

      return flow_result
    } catch (error) {
      vscode.window.showErrorMessage(
        t('feature.search-files.failed', {
          error: error instanceof Error ? error.message : String(error)
        })
      )
      Logger.error({
        function_name: 'search_files',
        message: 'Error searching files',
        data: error
      })
      break
    }
  }
  return undefined
}
