import * as vscode from 'vscode'
import { UpdateAgenticSearchInvocationCountMessage } from '../../types/messages'

export const handle_update_agentic_search_invocation_count = async (
  message: UpdateAgenticSearchInvocationCountMessage
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')

  await config.update(
    'agenticSearchInvocationCount',
    message.count,
    vscode.ConfigurationTarget.Global
  )
}
