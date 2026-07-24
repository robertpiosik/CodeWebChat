import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { LIMIT_SEMANTIC_SEARCH_RESULTS } from '@/constants/values'

export const handle_get_limit_semantic_search_results = async (
  provider: SettingsProvider
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
