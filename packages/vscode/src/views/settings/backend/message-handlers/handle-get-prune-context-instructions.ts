import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { prune_context_instructions } from '@/constants/instructions'

export const handle_get_prune_context_instructions = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('pruneContextInstructions') || prune_context_instructions
  provider.postMessage({
    command: 'PRUNE_CONTEXT_INSTRUCTIONS',
    instructions
  })
}
