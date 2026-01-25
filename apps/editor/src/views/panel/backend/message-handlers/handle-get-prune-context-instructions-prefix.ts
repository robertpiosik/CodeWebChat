import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { prune_context_instructions_prefix } from '@/constants/instructions'

export const handle_get_prune_context_instructions_prefix = (
  panel_provider: PanelProvider
): void => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const prefix =
    config.get<string>('pruneContextInstructionsPrefix') ||
    prune_context_instructions_prefix

  panel_provider.send_message({
    command: 'PRUNE_CONTEXT_INSTRUCTIONS_PREFIX',
    prefix
  })
}
