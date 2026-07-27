import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { LIMIT_SEMANTIC_SEARCH_RESULTS } from '@/constants/values'

export const handle_get_limit_semantic_search_results = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const limit =
    config.get<number>('limitSemanticSearchResults') ||
    LIMIT_SEMANTIC_SEARCH_RESULTS
  provider.postMessage({
    command: 'LIMIT_SEMANTIC_SEARCH_RESULTS',
    limit
  })
}
