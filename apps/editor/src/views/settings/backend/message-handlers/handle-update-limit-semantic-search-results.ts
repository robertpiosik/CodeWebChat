import * as vscode from 'vscode'
import { UpdateLimitSemanticSearchResultsMessage } from '@/views/settings/types/messages'

export const handle_update_limit_semantic_search_results = async (
  message: UpdateLimitSemanticSearchResultsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'limitSemanticSearchResults',
      message.limit || undefined,
      vscode.ConfigurationTarget.Global
    )
}
