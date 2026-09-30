import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'

export const handle_get_voice_input_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const default_instructions =
    config.inspect<string>('voiceInputInstructions')?.defaultValue || ''
  const instructions =
    config.get<string>('voiceInputInstructions') || default_instructions
  provider.postMessage({
    command: 'VOICE_INPUT_INSTRUCTIONS',
    instructions,
    default_instructions
  })
}
