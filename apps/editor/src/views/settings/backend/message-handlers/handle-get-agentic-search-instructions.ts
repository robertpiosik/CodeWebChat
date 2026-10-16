import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'

export const handle_get_agentic_search_instructions = async (
  provider: SettingsViewProvider
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions = config.get<string>('agenticSearchInstructions')
  const default_instructions = config.inspect<string>(
    'agenticSearchInstructions'
  )?.defaultValue

  provider.postMessage({
    command: 'AGENTIC_SEARCH_INSTRUCTIONS',
    instructions: instructions || '',
    default_instructions: default_instructions || ''
  })
}
